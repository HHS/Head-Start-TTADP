import { S3_ACTIONS } from '../constants';
import newQueue, { increaseListeners } from '../lib/queue';
import { deleteFileFromS3 } from '../lib/s3';
import { auditLogger, logger } from '../logger';
import { File, FileDeletion } from '../models';
import referenceData from '../workers/referenceData';
import transactionQueueWrapper from '../workers/transactionWrapper';

const s3Queue = newQueue('s3');

// A failed S3 delete is retried with growing delays (1, 2, 4, 8 minutes) before the job fails.
// After that the outbox row stays pending and the retry sweep requeues it.
const DELETE_FILE_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 60 * 1000 },
};

/**
 * Queues the S3 delete for a file.
 * @param {number} id - the deleted File's id
 * @param {string} key - its S3 key
 * @param {number} [fileDeletionId] - outbox row the job marks complete once the object is gone
 */
const addDeleteFileToQueue = (id, key, fileDeletionId = undefined) => {
  // Add delete file job to queue.
  const data = {
    fileId: id,
    fileKey: key,
    fileDeletionId,
    key: S3_ACTIONS.DELETE_FILE,
    ...referenceData(),
  };
  return s3Queue.add(S3_ACTIONS.DELETE_FILE, data, DELETE_FILE_JOB_OPTIONS);
};

/**
 * Deletes a file's S3 object, then marks its outbox row complete. S3 errors are thrown so
 * Bull retries the job. The object is kept if another File row still uses the same key.
 */
const deleteFileJob = async (job) => {
  const { fileId, fileKey, bucket, fileDeletionId } = job.data;

  const inUse = await File.findOne({ attributes: ['id'], where: { key: fileKey }, raw: true });
  const res = inUse ? null : await deleteFileFromS3(fileKey, bucket);

  if (fileDeletionId) {
    await FileDeletion.update(
      { completedAt: new Date() },
      { where: { id: fileDeletionId, completedAt: null } }
    );
  }

  return { status: 200, data: { fileId, fileKey, keptBecauseInUse: !!inUse, res } };
};

const onFailedS3Queue = (job, error) =>
  auditLogger.alertError(
    `job ${job.data.key} failed with error ${error}`,
    'queue_job_failed',
    error
  );
const onCompletedS3Queue = (job, result) => {
  if (result.status === 200 || result.status === 201 || result.status === 202) {
    logger.info(
      `job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`
    );
  } else {
    auditLogger.alertError(
      `job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`,
      'queue_job_non_success_status',
      result
    );
  }
};
const processS3Queue = () => {
  // S3 Queue.
  s3Queue.on('failed', onFailedS3Queue);
  s3Queue.on('completed', onCompletedS3Queue);
  increaseListeners(s3Queue);

  // Delete S3 file.
  s3Queue.process(
    S3_ACTIONS.DELETE_FILE,
    transactionQueueWrapper(deleteFileJob, S3_ACTIONS.DELETE_FILE)
  );
};

export {
  addDeleteFileToQueue,
  deleteFileJob,
  onCompletedS3Queue,
  onFailedS3Queue,
  processS3Queue,
  s3Queue,
};
