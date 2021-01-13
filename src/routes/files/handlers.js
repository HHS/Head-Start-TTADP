import { v4 as uuidv4 } from 'uuid';
import handleErrors from '../../lib/apiErrorHandler';

const AWS = require('aws-sdk');
const fs = require('fs');
const fileType = require('file-type');
const multiparty = require('multiparty');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  endpoint: process.env.S3_ENDPOINT,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
});

const namespace = 'SERVICE:FILES';

const logContext = {
  namespace,
};

const s3Upload = (buffer, name, type) => {
  const params = {
    Body: buffer,
    Bucket: process.env.bucket,
    ContentType: type.mime,
    Key: `${uuidv4()}.${type.ext}`,
  };
  return s3.upload(params).promise();
};

export default async function uploadHandler(req, res) {
  const form = new multiparty.Form();
  form.parse(req, async (error, fields, files) => {
    if (error) {
      res.status(500).send(error);
    }
    try {
      const { path } = files.File[0];
      const buffer = fs.createReadStream(path);
      const type = await fileType.fromFile(path);
      const fileName = `${Date.now().toString()}`;
      const data = await s3Upload(buffer, fileName, type);
      res.status(200).send(data);
    } catch (err) {
      await handleErrors(req, res, err, logContext);
    }
  });
}
