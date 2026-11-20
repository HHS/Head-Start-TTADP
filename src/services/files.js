import { DECIMAL_BASE } from '@ttahub/common';
import { Op } from 'sequelize';
import { FILE_STATUSES } from '../constants';
import { auditLogger } from '../logger';
import {
  ActivityReport,
  ActivityReportFile,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  CommunicationLogFile,
  File,
  FileDeletion,
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

// Bull waits for Redis to connect before adding a job, so with Redis down an enqueue never
// settles. Give up after this long; the outbox row stays pending for the retry sweep.
const S3_DELETE_ENQUEUE_TIMEOUT_MS = 5000;

/**
 * Queues the S3 delete for an outbox row, rejecting if Redis doesn't accept it in time.
 * @param {number} fileId
 * @param {string} key
 * @param {number} fileDeletionId
 */
const enqueueS3Delete = (fileId, key, fileDeletionId) => {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`timed out after ${S3_DELETE_ENQUEUE_TIMEOUT_MS}ms`)),
      S3_DELETE_ENQUEUE_TIMEOUT_MS
    );
  });
  return Promise.race([addDeleteFileToQueue(fileId, key, fileDeletionId), timeout]).finally(() =>
    clearTimeout(timer)
  );
};

/**
 * Queues the S3 deletes for outbox rows once their transaction has committed. Stops at the
 * first failure (e.g. Redis down) so a batch of files can't stack up enqueue timeouts and
 * hold the response; the rows left pending are picked up by the retry sweep.
 * @param {{ id: number, fileId: number, key: string }[]} deletions
 */
const enqueueCommittedS3Deletes = async (deletions) => {
  let queued = 0;
  try {
    // Sequelize v6 invokes afterCommit even if COMMIT fails, and a savepoint that rolled back
    // takes its rows with it. Only rows still on the primary were committed.
    const committed = await FileDeletion.findAll({
      attributes: ['id'],
      where: { id: deletions.map((d) => d.id) },
      transaction: null,
      useMaster: true,
      raw: true,
    });
    const committedIds = new Set(committed.map((d) => d.id));
    for (const deletion of deletions.filter((d) => committedIds.has(d.id))) {
      // eslint-disable-next-line no-await-in-loop
      await enqueueS3Delete(deletion.fileId, deletion.key, deletion.id);
      queued += 1;
    }
  } catch (err) {
    auditLogger.error(
      `SERVICE:FILES:removeOrphanedFiles Failed to queue S3 deletes (${queued} of ${deletions.length} queued, deletions ${deletions.map((d) => d.id).join(', ')}); the retry sweep will requeue the rest: ${err.message}`
    );
  }
};

// Outbox rows waiting for each outermost transaction to commit, so every file removed in
// one transaction is enqueued in a single post-commit batch.
const pendingS3DeletesByTransaction = new WeakMap();

/**
 * Adds an outbox row to its outermost transaction's post-commit batch.
 * @param {{ id: number, fileId: number, key: string }} deletion
 * @param {import('sequelize').Transaction} transaction
 */
const enqueueS3DeleteAfterCommit = (deletion, transaction) => {
  let root = transaction;
  while (root.parent) root = root.parent;

  const pending = pendingS3DeletesByTransaction.get(root);
  if (pending) {
    pending.push(deletion);
    return;
  }
  const batch = [deletion];
  pendingS3DeletesByTransaction.set(root, batch);
  root.afterCommit(() => enqueueCommittedS3Deletes(batch));
};

/**
 * Deletes each file that nothing references any more and queues its S3 object for deletion
 * once the transaction commits, so a rollback can't leave a File row whose object is gone.
 * Call this after removing a file's link rows; model hooks no longer clean up files.
 * @param {number[]} fileIds - files whose links were just removed; duplicates/nulls ignored
 * @param {object} [options]
 * @param {import('sequelize').Transaction} [options.transaction] - defaults to the CLS one
 * @param {(callback: () => Promise<void>) => void} [options.afterCommit] - registers the S3
 *   deletes as one callback; defaults to a batch on the outermost transaction's afterCommit
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
  // With a caller-supplied afterCommit, this call's rows go to it as one batch.
  const callerBatch = [];

  for (const { id } of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const file = await getFileById(id, transaction);
    if (file && !fileHasReferences(file)) {
      // eslint-disable-next-line no-await-in-loop
      await File.destroy({ where: { id: file.id }, transaction });
      removed.push(file.id);

      // Outbox row, written in this transaction: if enqueueing fails after commit, the cron
      // sweep (requeuePendingFileDeletions) still finds it, so the S3 cleanup isn't lost.
      // eslint-disable-next-line no-await-in-loop
      const deletion = await FileDeletion.create(
        { fileId: file.id, key: file.key },
        { transaction }
      );
      const outboxRow = { id: deletion.id, fileId: file.id, key: file.key };
      if (afterCommit) {
        callerBatch.push(outboxRow);
      } else {
        enqueueS3DeleteAfterCommit(outboxRow, transaction);
      }
    }
  }

  if (callerBatch.length) afterCommit(() => enqueueCommittedS3Deletes(callerBatch));
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

/**
 * Re-enqueues S3 deletes whose outbox row is still pending: the enqueue after commit failed,
 * or every attempt of the S3 job failed. Each successful enqueue counts as an attempt; a
 * failed enqueue (e.g. Redis down) doesn't, so an outage can't use up a row's attempts. Rows
 * that run out of attempts stay pending and, once their last job has had time to finish, are
 * reported so someone can look at them.
 * @param {object} [options]
 * @param {number} [options.olderThanMinutes] - skip rows touched more recently than this,
 *   so jobs that are still queued or retrying aren't duplicated. Kept below the hourly cron
 *   interval so a row requeued at one run is eligible again at the next.
 * @param {number} [options.maxAttempts] - stop re-enqueueing a row after this many passes
 * @param {number} [options.limit] - rows handled per pass
 * @returns {Promise<{ requeued: number, exhausted: number }>}
 */
const requeuePendingFileDeletions = async ({
  olderThanMinutes = 45,
  maxAttempts = 10,
  limit = 500,
} = {}) => {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  const pending = await FileDeletion.findAll({
    where: {
      completedAt: null,
      updatedAt: { [Op.lt]: cutoff },
      attempts: { [Op.lt]: maxAttempts },
    },
    order: [['id', 'ASC']],
    limit,
  });

  let requeued = 0;
  for (const deletion of pending) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await enqueueS3Delete(deletion.fileId, deletion.key, deletion.id);
      // Bumps updatedAt too, so later passes leave the queued job alone while it runs.
      // eslint-disable-next-line no-await-in-loop
      await deletion.update({ attempts: deletion.attempts + 1 });
      requeued += 1;
    } catch (err) {
      auditLogger.error(
        `SERVICE:FILES:requeuePendingFileDeletions Failed to queue S3 delete for file ${deletion.fileId} (deletion ${deletion.id}): ${err.message}`
      );
    }
  }

  // Same cutoff as the requeue: a row's final job may still be queued or retrying, so only
  // count it once that job has had time to finish.
  const exhausted = await FileDeletion.count({
    where: {
      completedAt: null,
      updatedAt: { [Op.lt]: cutoff },
      attempts: { [Op.gte]: maxAttempts },
    },
  });
  if (exhausted) {
    auditLogger.alertError(
      `SERVICE:FILES:requeuePendingFileDeletions ${exhausted} S3 file deletions are still pending after ${maxAttempts} attempts and need manual cleanup`,
      's3_orphaned_file'
    );
  }

  return { requeued, exhausted };
};

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
  enqueueS3Delete,
  fileHasReferences,
  fileIdsForActivityReportObjectives,
  getActivityReportFilesById,
  getActivityReportObjectiveFilesById,
  getFileById,
  markFilesQueuedForScan,
  queueFilesForScan,
  removeOrphanedFiles,
  requeuePendingFileDeletions,
  updateStatus,
  updateStatusByKey,
};
