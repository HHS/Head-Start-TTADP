import { DECIMAL_BASE } from '@ttahub/common';
import { FILE_STATUSES } from '../constants';
import { auditLogger } from '../logger';
import {
  ActivityReport,
  ActivityReportFile,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  CommunicationLogFile,
  File,
  ImportFile,
  SessionReportPilotFile,
  SessionReportPilotSupportingAttachment,
  sequelize,
} from '../models';
import { addDeleteFileToQueue } from './s3Queue';
import addToScanQueue from './scanQueue';

const { UPLOADING, QUEUED, QUEUEING_FAILED } = FILE_STATUSES;
// The unlink helpers below remove one link row. They don't remove the File; callers follow
// them with removeOrphanedFiles, which deletes the File if nothing else references it.
const deleteActivityReportFile = async (id) => ActivityReportFile.destroy({ where: { id } });
const deleteActivityReportObjectiveFile = async (id) =>
  ActivityReportObjectiveFile.destroy({ where: { id } });
const deleteCommunicationLogFile = async (id) => CommunicationLogFile.destroy({ where: { id } });
const deleteSessionFile = async (id) => SessionReportPilotFile.destroy({ where: { id } });
const deleteSessionSupportingAttachment = async (id) =>
  SessionReportPilotSupportingAttachment.destroy({ where: { id } });

const getFileById = async (id, transaction = undefined) =>
  File.findOne({
    where: { id },
    transaction,
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
      {
        model: ImportFile,
        as: 'importFile',
        required: false,
        attributes: ['id', 'importId'],
      },
    ],
  });

// Every association through which a record can point at a File. A File is only safe to
// delete when none of these hold a reference. Keep in sync with the includes in getFileById.
const FILE_REFERENCE_ASSOCIATIONS = [
  'reportFiles',
  'reportObjectiveFiles',
  'sessionFiles',
  'communicationLogFiles',
  'supportingAttachments',
  'importFile',
];

/**
 * Whether anything still references the file. Expects a File loaded by getFileById.
 * An association that wasn't loaded counts as a reference, so a partial load can never
 * make a file look orphaned.
 */
const fileHasReferences = (file) =>
  FILE_REFERENCE_ASSOCIATIONS.some((association) => {
    const value = file[association];
    if (value === undefined) {
      return true;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== null;
  });

/**
 * Promote the callback to each parent only after its savepoint commits.
 * @param {() => Promise<void>} callback
 * @param {import('sequelize').Transaction} transaction
 */
const runAfterOutermostCommit = (callback, transaction) =>
  transaction.afterCommit(() =>
    transaction.parent ? runAfterOutermostCommit(callback, transaction.parent) : callback()
  );

/**
 * Deletes each file that nothing references any more and queues its S3 object for deletion
 * once the transaction commits, so a rollback can't leave a File row whose object is gone.
 * Call this after removing a file's link rows; model hooks no longer clean up files.
 * @param {number[]} fileIds - files whose links were just removed; duplicates/nulls ignored
 * @param {object} [options]
 * @param {import('sequelize').Transaction} [options.transaction] - defaults to the CLS one
 * @param {(callback: () => Promise<void>) => void} [options.afterCommit] - registers the S3
 *   delete; defaults to the outermost transaction's afterCommit
 * @returns {Promise<number[]>} ids of the files that were deleted
 */
const removeOrphanedFiles = async (
  fileIds,
  { transaction = sequelize.constructor._cls?.get('transaction'), afterCommit } = {}
) => {
  const ids = [...new Set((fileIds || []).filter((id) => id !== null && id !== undefined))];
  if (!ids.length) return [];
  if (!transaction) {
    return sequelize.transaction((tx) =>
      removeOrphanedFiles(ids, { transaction: tx, afterCommit })
    );
  }

  // FK inserts take KEY SHARE on the File. Lock first, then read references in a fresh
  // statement so a link committed while we waited isn't mistaken for an orphan.
  const candidates = await File.findAll({
    attributes: ['id'],
    where: { id: ids },
    order: [['id', 'ASC']],
    lock: transaction.LOCK.UPDATE,
    transaction,
    raw: true,
  });
  const removed = [];

  for (const { id } of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const file = await getFileById(id, transaction);
    if (file && !fileHasReferences(file)) {
      // eslint-disable-next-line no-await-in-loop
      await File.destroy({ where: { id: file.id }, transaction });
      removed.push(file.id);

      const { key } = file;
      const queueS3Delete = async () => {
        try {
          // Sequelize v6 invokes afterCommit even if COMMIT fails. Check committed state
          // on the primary before deleting anything from object storage.
          const retained = await File.findOne({
            attributes: ['id'],
            where: { key },
            transaction: null,
            useMaster: true,
            raw: true,
          });
          if (!retained) await addDeleteFileToQueue(file.id, key);
        } catch (err) {
          auditLogger.error(
            `SERVICE:FILES:removeOrphanedFiles Failed to queue S3 delete for file ${file.id}: ${err.message}`
          );
        }
      };
      if (afterCommit) {
        afterCommit(queueS3Delete);
      } else {
        runAfterOutermostCommit(queueS3Delete, transaction);
      }
    }
  }

  return removed;
};

/**
 * Ids of the files linked to the activity report objectives matching `where`. Collect these
 * before removing the objectives so their files can be passed to removeOrphanedFiles.
 */
const fileIdsForActivityReportObjectives = async (where, transaction = undefined) =>
  (
    await ActivityReportObjectiveFile.findAll({
      attributes: ['fileId'],
      include: [
        {
          attributes: [],
          model: ActivityReportObjective,
          as: 'activityReportObjective',
          required: true,
          where,
        },
      ],
      raw: true,
      transaction,
    })
  ).map((aroFile) => aroFile.fileId);
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
  });
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
  });

const updateStatus = async (fileId, fileStatus) => {
  /* TODO: If an error occurs make sure it bubbles up. */
  let file;
  try {
    file = await File.update(
      { status: fileStatus },
      {
        where: { id: fileId },
        individualHooks: true,
      }
    );
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
  const results = await File.update(
    { status: fileStatus },
    {
      where: { key },
      individualHooks: true,
    }
  );
  const [, [file]] = results;
  // Return the updated file
  return file?.toJSON();
};

const findOrCreateFileForMetadata = async (originalFileName, s3FileName, fileSize) => {
  let file = await File.findOne({
    where: {
      originalFileName,
      key: s3FileName,
      fileSize,
    },
  });

  if (!file) {
    file = await File.create(
      {
        originalFileName,
        key: s3FileName,
        status: UPLOADING,
        fileSize,
      },
      { individualHooks: true }
    );
  }
  return file.toJSON();
};

// eslint-disable-next-line max-len
const createFileMetaData = async (originalFileName, s3FileName, fileSize) =>
  findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize);

const createActivityReportFileMetaData = async (
  originalFileName,
  s3FileName,
  reportId,
  fileSize
) => {
  const file = await findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize);
  await ActivityReportFile.create({ activityReportId: reportId, fileId: file.id });
  return file;
};

const createActivityReportObjectiveFileMetaData = async (
  originalFileName,
  s3FileName,
  activityReportObjectiveIds,
  fileSize
) => {
  const file = await findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize);
  await Promise.all(
    activityReportObjectiveIds.map((id) =>
      ActivityReportObjectiveFile.create({
        activityReportObjectiveId: id,
        fileId: file.id,
      })
    )
  );
  return file;
};

const createSessionObjectiveFileMetaData = async (
  originalFileName,
  s3FileName,
  sessionReportPilotId,
  fileSize
) => {
  const file = await findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize);
  await SessionReportPilotFile.create({ sessionReportPilotId, fileId: file.id });
  return file;
};

const createSessionSupportingAttachmentMetaData = async (
  originalFileName,
  s3FileName,
  sessionReportPilotId,
  fileSize
) => {
  const file = await findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize);
  await SessionReportPilotSupportingAttachment.create({ sessionReportPilotId, fileId: file.id });
  return file;
};

const createCommunicationLogFileMetadata = async (
  originalFileName,
  s3FileName,
  communicationLogId,
  fileSize
) => {
  const file = await findOrCreateFileForMetadata(originalFileName, s3FileName, fileSize);
  await CommunicationLogFile.create({ communicationLogId, fileId: file.id });
  return file;
};

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
  });

  // Get ARO file ids.
  const aroFileIdsToDelete = aroFilesToDelete.map((aroFile) => aroFile.id);

  // Delete ARO files.
  const unlinked = await ActivityReportObjectiveFile.destroy({
    where: { id: aroFileIdsToDelete },
  });

  if (unlinked) await removeOrphanedFiles([parseInt(fileId, DECIMAL_BASE)]);
};

/**
 * Marks uploaded files as queued for virus scanning. Call this inside the transaction that
 * created the files, before queueFilesForScan, so the scan worker's later status updates
 * can't be overwritten by this one.
 * @param {{ id: number }[]} files
 */
const markFilesQueuedForScan = async (files) =>
  Promise.all(files.map((file) => updateStatus(file.id, QUEUED)));

/**
 * Adds a virus scan job for each file, marking any file that can't be queued as
 * QUEUEING_FAILED. The scan worker looks files up by key, so only call this once the
 * transaction that created the File rows has committed.
 * @param {{ id: number, key: string, originalFileName: string }[]} files
 */
const queueFilesForScan = async (files) =>
  Promise.all(
    files.map(async (file) => {
      try {
        await addToScanQueue({ key: file.key });
      } catch (err) {
        auditLogger.error(
          `SERVICE:FILES:queueFilesForScan Failed to queue ${file.originalFileName}. Error: ${err}`
        );
        await updateStatus(file.id, QUEUEING_FAILED);
      }
    })
  );

export {
  createActivityReportFileMetaData,
  createActivityReportObjectiveFileMetaData,
  createCommunicationLogFileMetadata,
  createFileMetaData,
  createSessionObjectiveFileMetaData,
  createSessionSupportingAttachmentMetaData,
  deleteActivityReportFile,
  deleteActivityReportObjectiveFile,
  deleteCommunicationLogFile,
  deleteSessionFile,
  deleteSessionSupportingAttachment,
  deleteSpecificActivityReportObjectiveFile,
  fileHasReferences,
  fileIdsForActivityReportObjectives,
  getActivityReportFilesById,
  getActivityReportObjectiveFilesById,
  getFileById,
  markFilesQueuedForScan,
  queueFilesForScan,
  removeOrphanedFiles,
  updateStatus,
  updateStatusByKey,
};
