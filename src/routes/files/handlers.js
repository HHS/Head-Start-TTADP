import { v4 as uuidv4 } from 'uuid';
import handleErrors from '../../lib/apiErrorHandler';
import { sequelize, File } from '../../models';
import s3Uploader from '../../lib/s3Uploader';

const fs = require('fs');
const fileType = require('file-type');
const multiparty = require('multiparty');

const namespace = 'SERVICE:FILES';

const logContext = {
  namespace,
};

async function createFileMetaData(originalFileName, s3FileName, reportId) {
  const newFile = {
    activityReportId: reportId,
    originalFileName,
    key: s3FileName,
    status: 'UPLOADING',
  };
  let file;
  try {
    await sequelize.transaction(async (transaction) => {
      file = await File.create(newFile, transaction);
    });
    console.log("DB entry created")
    return file.dataValues;
  } catch (error) {
    console.log(`db error = ${error}`)
    return error;
  }
}
const updateStatus = async (fileId, fileStatus) => {
  let file;
  try {
    await sequelize.transaction(async (transaction) => {
      file = await File.update({ status: fileStatus }, { where: { id: fileId } }, transaction);
    });
    console.log(await File.findAll({ where: { id: fileId } }));
    return file.dataValues;
  } catch (error) {
    return error;
  }
};

export default async function uploadHandler(req, res) {
  const form = new multiparty.Form();
  form.parse(req, async (error, fields, files) => {
    if (error) {
      res.status(500).send(error);
    }
    let buffer;
    let metadata;
    let fileName;
    let type;

    try {
      const { path, originalFilename } = files.File[0];
      const reportId = fields.reportID;
      buffer = fs.readFileSync(path);
      type = await fileType.fromFile(path);
      fileName = `${uuidv4()}.${type.ext}`;
      metadata = await createFileMetaData(originalFilename, fileName, reportId);
    } catch (err) {
      await handleErrors(req, res, err, logContext);
    }
    try {
      await s3Uploader(buffer, fileName, type);
      const ret = await updateStatus(metadata.id, 'UPLOADED');
      res.status(200).send(JSON.stringify(ret));
    } catch (err) {
      const result = await updateStatus(metadata.id, 'UPLOAD_FAILED');
      console.log(`result=${result}`)
      console.log(`id=${metadata.id}`)
      await handleErrors(req, res, err, logContext);
    }
  });
}
