import temp from 'temp';
import generateMetadataFromFile from '../lib/fileProcessing';
import { downloadFile } from '../lib/s3';
import { sequelize, File } from '../models';
import { updateMetadata } from '../services/files';
import { auditLogger } from '../logger';

const exportFileMetadata = () => sequelize.transaction(async (transaction) => {
  try {
    const files = File.findAll({ where: { metadata: null }, transaction });
    files.map(async (file) => {
      let stream;
      let hasFile;
      try {
        auditLogger.info(JSON.stringify(file));
        temp.track(); // Automatically track and cleanup files at exit
        stream = temp.createWriteStream();
        hasFile = stream.write(await downloadFile(files.key));
      } catch (err) {
        auditLogger.error(JSON.stringify(err));
      }
      if (hasFile) {
        try {
          auditLogger.info(hasFile);
          auditLogger.info(stream.path);
          await updateMetadata(file.id, generateMetadataFromFile(stream.path));
          stream.end();
        } catch (err) {
          auditLogger.error(JSON.stringify(err));
          throw (err);
        }
      }
    });
  } catch (err) {
    auditLogger.error(JSON.stringify(err));
    throw (err);
  }
});

export default exportFileMetadata;
