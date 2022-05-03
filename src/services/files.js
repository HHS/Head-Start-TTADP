import { ActivityReportFile, File } from '../models';
import { FILE_STATUSES } from '../constants';

const { UPLOADING } = FILE_STATUSES;
export const deleteFile = async (id) => {
  await File.destroy({ where: { id } });
};

export const getFileById = async (id) => File.findOne({ where: { id } });

export const updateStatus = async (fileId, fileStatus) => {
  let file;
  try {
    file = await File.update({ status: fileStatus }, { where: { id: fileId } });
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
    file = await File.create(newFile);
    await ActivityReportFile.create({ activityReportId: reportId, fileId: file.id });
    return file.dataValues;
  } catch (error) {
    return error;
  }
}
