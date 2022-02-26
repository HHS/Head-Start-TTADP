/* eslint-disable no-await-in-loop */
import fs from 'fs';
import { Op } from 'sequelize';
import {
  spinUpTool,
  isToolUp,
  shutdownTool,
  generateMetadataFromFile,
} from '../lib/fileProcessing';
import { downloadFile } from '../lib/s3';
import { sequelize, File } from '../models';
import { updateMetadata } from '../services/files';
import { auditLogger } from '../logger';

const deleteIfExists = async (file, transaction) => {
  try {
    const stat = fs.statSync(`./${file.key}`);
    if (stat) {
      try {
        fs.unlinkSync(`./${file.key}`);
      } catch (err2) {
        auditLogger.error(JSON.stringify({ message: 'Failed to delete file', err2 }));
        await file.changed('updatedAt', true);
        await file.update({ updatedAt: new Date(), transaction });
      }
    }
  } catch (err) {
    auditLogger.info(JSON.stringify({ message: 'File does not exist', err }));
  }
};

const doesFileExist = async (file) => {
  let exists = false;
  try {
    const stat = fs.statSync(`./${file.key}`);
    if (stat) {
      exists = true;
    }
  } catch (err) {
    auditLogger.info(JSON.stringify({ message: 'File does not exist', err }));
  }
  return exists;
};

const processFile = async (file, transaction) => {
  let fileDownload;
  let hasFile;
  let metadataLoaded = false;
  let fileExtension;

  auditLogger.info(JSON.stringify(file));
  try {
    const nameParts = file.key.split('.');
    fileExtension = nameParts[nameParts.length - 1];
  } catch (err) {
    auditLogger.error(JSON.stringify({ message: 'Failed to pull file extension', err }));
    await file.changed('updatedAt', true);
    await file.update({ updatedAt: new Date(), transaction });
    throw (err);
  }
  await deleteIfExists(file, transaction);

  try {
    fileDownload = await downloadFile(file.key);
  } catch (err) {
    auditLogger.error(JSON.stringify({ message: 'Failed to download file', err }));
    await file.changed('updatedAt', true);
    await file.update({ updatedAt: new Date(), transaction });
    throw (err);
  }

  try {
    try {
      fs.writeFileSync(`./${file.key}`, fileDownload.Body);
      hasFile = await doesFileExist(file, transaction);
    } catch (err) {
      auditLogger.error(JSON.stringify({ message: 'Failed to crate stream for file', err }));
      await deleteIfExists(file, transaction);
      await file.changed('updatedAt', true);
      await file.update({ updatedAt: new Date(), transaction });
      throw (err);
    }

    if (hasFile) {
      try {
        if (isToolUp()) {
          const metadata = await generateMetadataFromFile(`./${file.key}`);
          if (['txt', 'csv'].includes(fileExtension) > -1 || Object.keys(metadata.value).length > 1) {
            await updateMetadata(file.id, metadata, transaction);
            metadataLoaded = true;
          }
        }
      } catch (err) {
        auditLogger.error(JSON.stringify({ message: 'Failed to collect metadata from file', err }));
        await deleteIfExists(file, transaction);
        await file.changed('updatedAt', true);
        await file.update({ updatedAt: new Date(), transaction });
        throw (err);
      }
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ message: 'Failed to use temp file', err }));
    await deleteIfExists(file, transaction);
    await file.changed('updatedAt', true);
    await file.update({ updatedAt: new Date(), transaction });
    throw (err);
  }

  await deleteIfExists(file, transaction);
  if (metadataLoaded) {
    await file.update({ updatedAt: new Date(), transaction });
  }
};

const latestFile = async (transaction) => {
  let mostRecent;
  try {
    const fileData = await File.findOne({
      group: ['updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 1,
      attributes: [[sequelize.fn('to_char', sequelize.fn('max', sequelize.col('updatedAt')), 'YYYY-MM-DD HH24:MI:SS.MS'), 'mostRecent']],
      where: { metadata: null },
      transaction,
    });
    if (fileData) mostRecent = fileData.dataValues.mostRecent;
  } catch (err) {
    auditLogger.error(JSON.stringify(err));
    throw (err);
  }
  return mostRecent;
};

const exportFileMetadata = async () => {
  await sequelize.transaction(async (transaction) => {
    let mostRecent;
    let files;
    const processedKeys = [];
    try {
      mostRecent = await latestFile(transaction);
      await spinUpTool();
      if (mostRecent) {
        do {
          files = await File.findAll({
            order: [['updatedAt', 'DESC']],
            limit: 1,
            where: {
              metadata: null,
              updatedAt: { [Op.lte]: sequelize.fn('TO_TIMESTAMP', mostRecent, 'YYYY-MM-DD HH24:MI:SS.MS') },
              key: { [Op.notIn]: processedKeys },
            },
            transaction,
          });
          await Promise.all(files.map(async (file) => {
            await processFile(file, transaction);
            processedKeys.push(file.key);
          }));
        } while (files.length > 0);
      }
      await shutdownTool();
      auditLogger.info(JSON.stringify({ Start: mostRecent, End: await latestFile(transaction) }));
    } catch (err) {
      auditLogger.error(JSON.stringify(err));
      throw (err);
    }
  });
};

export default exportFileMetadata;
