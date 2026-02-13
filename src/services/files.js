import { DECIMAL_BASE } from '@ttahub/common'
import {
  ActivityReport,
  ActivityReportFile,
  ActivityReportObjectiveFile,
  File,
  ActivityReportObjective,
  SessionReportPilotFile,
  CommunicationLogFile,
  SessionReportPilotSupportingAttachment,
} from '../models'
import { FILE_STATUSES } from '../constants'

const { UPLOADING } = FILE_STATUSES
const deleteFile = async (id) =>
  File.destroy({
    where: { id },
    individualHooks: true,
  })
const deleteActivityReportFile = async (id) =>
  ActivityReportFile.destroy({
    where: { id },
    individualHooks: true,
  })
// TODO GH - need to pass hookMetadata
const deleteActivityReportObjectiveFile = async (id) =>
  ActivityReportObjectiveFile.destroy({
    where: { id },
    individualHooks: true,
  })
const deleteCommunicationLogFile = async (id) =>
  CommunicationLogFile.destroy({
    where: { id },
    individualHooks: true,
  })
const deleteSessionFile = async (id) =>
  SessionReportPilotFile.destroy({
    where: { id },
    individualHooks: true,
  })

// eslint-disable-next-line max-len
const deleteSessionSupportingAttachment = async (id) =>
  SessionReportPilotSupportingAttachment.destroy({
    where: { id },
    individualHooks: true,
  })

const getFileById = async (id) =>
  File.findOne({
    where: { id },
    include: [
      {
        model: ActivityReport,
        as: 'reports',
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
  })
const getActivityReportFilesById = async (reportId) =>
  ActivityReportFile.findAll({
    where: { activityReportId: reportId },
    include: [
      {
        model: File,
        as: 'file',
        required: true,
      },
    ],
  })
const getActivityReportObjectiveFilesById = async (reportId, objectiveId) =>
  ActivityReportObjectiveFile.findAll({
    where: { activityReportId: reportId, objectiveId },
    include: [
      {
        model: File,
        as: 'file',
        required: true,
      },
    ],
  })

const updateStatus = async (fileId, fileStatus) => {
  /* TODO: If an error occurs make sure it bubbles up. */
  let file
  try {
    file = await File.update(
      { status: fileStatus },
      {
        where: { id: fileId },
        individualHooks: true,
      }
    )
    return file.dataValues
  } catch (error) {
    return error
  }
}

/**
 * Updates the status of a file in the database based on its key.
 * @param {string} key - The key of the file to update.
 * @param {string} fileStatus - The new status of the file.
 * @returns {Promise<Object|Error>} - A promise that resolves to the updated file object or
 * an error object if an error occurs.
 */
const updateStatusByKey = async (key, fileStatus) => {
  // Update the file's status in the database using the File model
  const results = await File.update(
    { status: fileStatus },
    {
      where: { key },
      individualHooks: true,
    }
  )
  const [, [file]] = results
  // Return the updated file
  return file?.toJSON()
}

const findOrCreateFileForMetadata = async (originalFileName, s3FileName, fileSize) => {
  let file = await File.findOne({
    where: {
      originalFileName,
      key: s3FileName,
      fileSize,
    },
  })

  if (!file) {
    file = await File.create(
      {
        originalFileName,
        key: s3FileName,
        status: UPLOADING,
        fileSize,
      },
      { individualHooks: true }
    )
  }
  return file.toJSON()
}

// eslint-disable-next-line max-len
const createFileMetaData = async (originalFileName, s3FileName, fileSize) => findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize)

const createActivityReportFileMetaData = async (originalFileName, s3FileName, reportId, fileSize) => {
  const file = await findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize)
  await ActivityReportFile.create({ activityReportId: reportId, fileId: file.id })
  return file
}

const createActivityReportObjectiveFileMetaData = async (originalFileName, s3FileName, activityReportObjectiveIds, fileSize) => {
  const file = await findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize)
  await Promise.all(
    activityReportObjectiveIds.map((id) =>
      ActivityReportObjectiveFile.create({
        activityReportObjectiveId: id,
        fileId: file.id,
      })
    )
  )
  return file
}

const createSessionObjectiveFileMetaData = async (originalFileName, s3FileName, sessionReportPilotId, fileSize) => {
  const file = await findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize)
  await SessionReportPilotFile.create({ sessionReportPilotId, fileId: file.id })
  return file
}

const createSessionSupportingAttachmentMetaData = async (originalFileName, s3FileName, sessionReportPilotId, fileSize) => {
  const file = await findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize)
  await SessionReportPilotSupportingAttachment.create({ sessionReportPilotId, fileId: file.id })
  return file
}

const createCommunicationLogFileMetadata = async (originalFileName, s3FileName, communicationLogId, fileSize) => {
  const file = await findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize)
  await CommunicationLogFile.create({ communicationLogId, fileId: file.id })
  return file
}

const deleteSpecificActivityReportObjectiveFile = async (reportId, fileId, objectiveIds) => {
  // Get ARO files to delete
  const aroFilesToDelete = await ActivityReportObjectiveFile.findAll({
    attributes: ['id'],
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
  })

  // Get ARO file ids.
  const aroFileIdsToDelete = aroFilesToDelete.map((aroFile) => aroFile.id)

  // Delete ARO files.
  await ActivityReportObjectiveFile.destroy({
    where: { id: aroFileIdsToDelete },
    individualHooks: true,
  })
}

export {
  deleteFile,
  deleteActivityReportFile,
  deleteActivityReportObjectiveFile,
  deleteCommunicationLogFile,
  deleteSessionSupportingAttachment,
  deleteSessionFile,
  getFileById,
  getActivityReportFilesById,
  getActivityReportObjectiveFilesById,
  updateStatus,
  updateStatusByKey,
  createFileMetaData,
  createActivityReportFileMetaData,
  createActivityReportObjectiveFileMetaData,
  createSessionObjectiveFileMetaData,
  deleteSpecificActivityReportObjectiveFile,
  createCommunicationLogFileMetadata,
  createSessionSupportingAttachmentMetaData,
}
