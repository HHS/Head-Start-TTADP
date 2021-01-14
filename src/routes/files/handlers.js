import { v4 as uuidv4 } from 'uuid';
import handleErrors from '../../lib/apiErrorHandler';
import { sequelize, File } from '../../models';

const AWS = require('aws-sdk');
const fs = require('fs');
const fileType = require('file-type');
const multiparty = require('multiparty');

const namespace = 'SERVICE:FILES';

const logContext = {
  namespace,
};
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  endpoint: process.env.S3_ENDPOINT,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
});

const s3Uploader = (buffer, name, type) => {
  const params = {
    Body: buffer,
    Bucket: process.env.bucket,
    ContentType: type.mime,
    Key: name,
  };

  return s3.upload(params).promise();
};

export async function createFileMetaData(originalFileName, s3FileName) {
  const newFile = {
    originalFileName,
    key: s3FileName,
    FileStatusID: 1,
  };
  let file;
  try {
    await sequelize.transaction(async (transaction) => {
      file = await File.create(newFile, transaction);
    });
    return file;
  } catch (error) {
    return error;
  }
}

export default async function uploadHandler(req, res) {
  const form = new multiparty.Form();
  form.parse(req, async (error, fields, files) => {
    if (error) {
      res.status(500).send(error);
    }
    try {
      const { path, originalFilename } = files.File[0];
      const buffer = fs.readFileSync(path);
      const type = await fileType.fromFile(path);
      const fileName = `${uuidv4()}.${type.ext}`;
      await s3Uploader(buffer, fileName, type);
      const ret = createFileMetaData(originalFilename, fileName);
      res.json(ret);
    } catch (err) {
      await handleErrors(req, res, err, logContext);
    }
  });
}
