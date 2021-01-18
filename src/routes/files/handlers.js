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
    return file.dataValues;
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
      console.log(fields)
      const { path, originalFilename } = files.File[0];
      const buffer = fs.readFileSync(path);
      const type = await fileType.fromFile(path);
      const fileName = `${uuidv4()}.${type.ext}`;
      await s3Uploader(buffer, fileName, type);
      const ret = createFileMetaData(originalFilename, fileName);
      ret.then((val) => res.json(val));
    } catch (err) {
      await handleErrors(req, res, err, logContext);
    }
  });
}
