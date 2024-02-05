import { DECIMAL_BASE } from '@ttahub/common';
import {
  ActivityReport,
  ActivityReportFile,
  ActivityReportObjectiveFile,
  File,
  Objective,
  ObjectiveFile,
  ObjectiveTemplate,
  ObjectiveTemplateFile,
  ActivityReportObjective,
  SessionReportPilotFile,
  CommunicationLogFile,
  SessionReportPilotSupportingAttachment,
  sequelize,
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
// TODO GH - need to pass hookMetadata
const deleteActivityReportObjectiveFile = async (id) => ActivityReportObjectiveFile.destroy({
  where: { id },
  individualHooks: true,
});
const deleteObjectiveFile = async (id) => ObjectiveFile.destroy({
  where: { id },
  individualHooks: true,
});
const deleteCommunicationLogFile = async (id) => CommunicationLogFile.destroy({
  where: { id },
  individualHooks: true,
});
const deleteSessionFile = async (id) => SessionReportPilotFile.destroy({
  where: { id },
  individualHooks: true,
});

// eslint-disable-next-line max-len
const deleteSessionSupportingAttachment = async (id) => SessionReportPilotSupportingAttachment.destroy({
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
    {
      model: SessionReportPilotFile,
      as: 'sessionFiles',
      required: false,
      attributes: ['id', 'sessionReportPilotId'],
    },
    {
      model: CommunicationLogFile,
      as: 'communicationLogFiles',
      required: false,
      attributes: ['id', 'communicationLogId'],
    },
    {
      model: SessionReportPilotSupportingAttachment,
      as: 'supportingAttachments',
      required: false,
      attributes: ['id', 'sessionReportPilotId'],
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

/**
 * Updates the status of a file in the database based on its key.
 * @param {string} key - The key of the file to update.
 * @param {string} fileStatus - The new status of the file.
 * @returns {Promise<Object|Error>} - A promise that resolves to the updated file object or
 * an error object if an error occurs.
 */
const updateStatusByKey = async (key, fileStatus) => {
  // Update the file's status in the database using the File model
  const results = await File.update({ status: fileStatus }, {
    where: { key },
    individualHooks: true,
  });
  const [, [file]] = results;
  // Return the updated file
  return file?.toJSON();
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
    .create({
      activityReportId: reportId,
      activityReportObjectiveId: objectiveId,
      fileId: file.id,
    });
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

const createSessionObjectiveFileMetaData = async (
  originalFileName,
  s3FileName,
  sessionReportPilotId,
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

  await SessionReportPilotFile.create({ sessionReportPilotId, fileId: file.id });
  return file.dataValues;
};

const createSessionSupportingAttachmentMetaData = async (
  originalFileName,
  s3FileName,
  sessionReportPilotId,
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

  await SessionReportPilotSupportingAttachment.create({ sessionReportPilotId, fileId: file.id });
  return file.dataValues;
};

const createCommunicationLogFileMetadata = async (
  originalFileName,
  s3FileName,
  communicationLogId,
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

  await CommunicationLogFile.create({ communicationLogId, fileId: file.id });
  return file.dataValues;
};

const deleteSpecificActivityReportObjectiveFile = async (reportId, fileId, objectiveIds) => {
  // Get ARO files to delete (destroy does NOT support join's).
  const aroFileToDelete = await ActivityReportObjectiveFile.findAll({
    raw: true,
    attributes: [[
      sequelize.fn('ARRAY_AGG', sequelize.fn('DISTINCT', sequelize.col('"ActivityReportObjectiveFile"."id"'))),
      'ids',
    ]],
    where: {
      fileId: parseInt(fileId, DECIMAL_BASE),
    },
    include: [
      {
        attributes: [],
        as: 'activityReportObjective',
        required: true,
        model: ActivityReportObjective,
        where: {
          activityReportId: parseInt(reportId, DECIMAL_BASE),
          objectiveId: objectiveIds,
        },

      },
    ],
  });

  // Get ARO file ids.
  const aroFileIdsToDelete = aroFileToDelete[0].ids;

  // Delete ARO files.
  await ActivityReportObjectiveFile.destroy({
    where: { id: aroFileIdsToDelete },
    hookMetadata: { objectiveIds },
    individualHooks: true,
  });
};

export {
  deleteFile,
  deleteActivityReportFile,
  deleteActivityReportObjectiveFile,
  deleteCommunicationLogFile,
  deleteSessionSupportingAttachment,
  deleteObjectiveFile,
  deleteSessionFile,
  deleteObjectiveTemplateFile,
  getFileById,
  getActivityReportFilesById,
  getActivityReportObjectiveFilesById,
  getObjectiveFilesById,
  getObjectiveTemplateFilesById,
  updateStatus,
  updateStatusByKey,
  createFileMetaData,
  createActivityReportFileMetaData,
  createActivityReportObjectiveFileMetaData,
  createObjectiveFileMetaData, // for one objective
  createObjectivesFileMetaData, // for more than one objective
  createObjectiveTemplateFileMetaData,
  createSessionObjectiveFileMetaData,
  deleteSpecificActivityReportObjectiveFile,
  createCommunicationLogFileMetadata,
  createSessionSupportingAttachmentMetaData,
};
