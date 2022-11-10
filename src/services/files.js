import {
  ActivityReport,
  ActivityReportFile,
  ActivityReportObjectiveFile,
  File,
  Objective,
  ObjectiveFile,
  ObjectiveTemplate,
  ObjectiveTemplateFile,
} from '../models';
import { FILE_STATUSES } from '../constants';

const { UPLOADING } = FILE_STATUSES;
const deleteFile = async (id) => File.destroy({
  where: { id },
  individualHooks: true,
});
const deleteActivityReportFile = async (id) => ActivityReportFile.destroy({
  where: { id },
  individualHooks: true,
});
const deleteActivityReportObjectiveFile = async (id) => ActivityReportObjectiveFile.destroy({
  where: { id },
  individualHooks: true,
});
const deleteObjectiveFile = async (id) => ObjectiveFile.destroy({
  where: { id },
  individualHooks: true,
});
const deleteObjectiveTemplateFile = async (id) => ObjectiveTemplateFile.destroy({
  where: { id },
  individualHooks: true,
});

const getFileById = async (id) => File.findOne({
  where: { id },
  include: [
    {
      model: ActivityReport,
      as: 'reports',
      required: false,
    },
    {
      model: Objective,
      as: 'objectives',
      required: false,
    },
    {
      model: ObjectiveTemplate,
      as: 'objectiveTemplates',
      required: false,
    },
    {
      model: ActivityReportFile,
      as: 'reportFiles',
      required: false,
      attributes: ['id', 'activityReportId'],
    },
    {
      model: ActivityReportObjectiveFile,
      as: 'reportObjectiveFiles',
      required: false,
      attributes: ['id', 'activityReportObjectiveId'],
    },
    {
      model: ObjectiveFile,
      as: 'objectiveFiles',
      required: false,
      attributes: ['id', 'objectiveId'],
    },
    {
      model: ObjectiveTemplateFile,
      as: 'objectiveTemplateFiles',
      required: false,
      attributes: ['id', 'objectiveTemplateId'],
    },
  ],
});
const getActivityReportFilesById = async (reportId) => ActivityReportFile.findAll({
  where: { activityReportId: reportId },
  include: [
    {
      model: File,
      as: 'file',
      required: true,
    },
  ],
});
const getActivityReportObjectiveFilesById = async (
  reportId,
  objectiveId,
) => ActivityReportObjectiveFile.findAll({
  where: { activityReportId: reportId, objectiveId },
  include: [
    {
      model: File,
      as: 'file',
      required: true,
    },
  ],
});
const getObjectiveFilesById = async (objectiveId) => ObjectiveFile.findAll({
  where: { objectiveId },
  include: [
    {
      model: File,
      as: 'file',
      required: true,
    },
  ],
});
const getObjectiveTemplateFilesById = async (objectiveTemplateId) => ObjectiveTemplateFile.findAll({
  where: { objectiveTemplateId },
  include: [
    {
      model: File,
      as: 'file',
      required: true,
    },
  ],
});

const updateStatus = async (fileId, fileStatus) => {
  /* TODO: If an error occurs make sure it bubbles up. */
  let file;
  try {
    file = await File.update({ status: fileStatus }, {
      where: { id: fileId },
      individualHooks: true,
    });
    return file.dataValues;
  } catch (error) {
    return error;
  }
};

const createFileMetaData = async (originalFileName, s3FileName, fileSize) => {
  const newFile = {
    originalFileName,
    key: s3FileName,
    status: UPLOADING,
    fileSize,
  };
  const [file] = await File.findOrCreate({
    where: {
      originalFileName: newFile.originalFileName,
      key: newFile.key,
      fileSize: newFile.fileSize,
    },
    defaults: newFile,
  });

  return file.dataValues;
};

const createActivityReportFileMetaData = async (
  originalFileName,
  s3FileName,
  reportId,
  fileSize,
) => {
  const newFile = {
    originalFileName,
    key: s3FileName,
    status: UPLOADING,
    fileSize,
  };
  const [file] = await File.findOrCreate({
    where: {
      originalFileName: newFile.originalFileName,
      key: newFile.key,
      fileSize: newFile.fileSize,
    },
    defaults: newFile,
  });
  await ActivityReportFile.create({ activityReportId: reportId, fileId: file.id });
  return file.dataValues;
};

const createActivityReportObjectiveFileMetaData = async (
  originalFileName,
  s3FileName,
  reportId,
  objectiveId,
  fileSize,
) => {
  const newFile = {
    originalFileName,
    key: s3FileName,
    status: UPLOADING,
    fileSize,
  };
  const [file] = await File.findOrCreate({
    where: {
      originalFileName: newFile.originalFileName,
      key: newFile.key,
      fileSize: newFile.fileSize,
    },
    defaults: newFile,
  });
  await ActivityReportObjectiveFile
    .create({ activityReportId: reportId, objectiveId, fileId: file.id });
  return file.dataValues;
};

const createObjectivesFileMetaData = async (
  originalFileName,
  s3FileName,
  objectiveIds,
  fileSize,
) => {
  const newFile = {
    originalFileName,
    key: s3FileName,
    status: UPLOADING,
    fileSize,
  };
  const [file] = await File.findOrCreate({
    where: {
      originalFileName: newFile.originalFileName,
      key: newFile.key,
      fileSize: newFile.fileSize,
    },
    defaults: newFile,
  });
  await Promise.all(objectiveIds.map(
    (objectiveId) => ObjectiveFile.create({ objectiveId, fileId: file.id }),
  ));
  return file.dataValues;
};

const createObjectiveFileMetaData = async (
  originalFileName,
  s3FileName,
  objectiveId,
  fileSize,
) => {
  const newFile = {
    originalFileName,
    key: s3FileName,
    status: UPLOADING,
    fileSize,
  };
  const [file] = await File.findOrCreate({
    where: {
      originalFileName: newFile.originalFileName,
      key: newFile.key,
      fileSize: newFile.fileSize,
    },
    defaults: newFile,
  });
  await ObjectiveFile.create({ objectiveId, fileId: file.id });
  return file.dataValues;
};

const createObjectiveTemplateFileMetaData = async (
  originalFileName,
  s3FileName,
  objectiveTemplateId,
  fileSize,
) => {
  const newFile = {
    originalFileName,
    key: s3FileName,
    status: UPLOADING,
    fileSize,
  };
  const [file] = await File.findOrCreate({
    where: {
      originalFileName: newFile.originalFileName,
      key: newFile.s3FileName,
      fileSize: newFile.fileSize,
    },
    defaults: newFile,
  });
  await ObjectiveTemplateFile.create({ objectiveTemplateId, fileId: file.id });
  return file.dataValues;
};

export {
  deleteFile,
  deleteActivityReportFile,
  deleteActivityReportObjectiveFile,
  deleteObjectiveFile,
  deleteObjectiveTemplateFile,
  getFileById,
  getActivityReportFilesById,
  getActivityReportObjectiveFilesById,
  getObjectiveFilesById,
  getObjectiveTemplateFilesById,
  updateStatus,
  createFileMetaData,
  createActivityReportFileMetaData,
  createActivityReportObjectiveFileMetaData,
  createObjectiveFileMetaData, // for one objective
  createObjectivesFileMetaData, // for more than one objective
  createObjectiveTemplateFileMetaData,
};
