import db, { File } from '../models';
import { FILE_STATUSES } from '../constants';

const { UPLOADING } = FILE_STATUSES;
export const deleteFile = async (id) => {
  await File.destroy({ where: { id } });
};

export const getFileById = async (id) => File.findOne({ where: { id } });

export const updateStatus = async (fileId, fileStatus) => {
  let file;
  try {
    await db.sequelize.transaction(async (transaction) => {
      file = await File.update({ status: fileStatus }, { where: { id: fileId }, transaction });
    });
    return file.dataValues;
  } catch (error) {
    return error;
  }
};

export default async function createFileMetaData(
  originalFileName,
  s3FileName,
  reportId,
  fileSize,
) {
  const newFile = {
    activityReportId: reportId,
    originalFileName,
    key: s3FileName,
    status: UPLOADING,
    fileSize,
  };
  let file;
  try {
    await db.sequelize.transaction(async (transaction) => {
      file = await File.create(newFile, transaction);
    });
    return file.dataValues;
  } catch (error) {
    return error;
  }
}
