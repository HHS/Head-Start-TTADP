import newQueue, { increaseListeners } from '../lib/queue';
import { S3_ACTIONS } from '../constants';
import { logger, auditLogger } from '../logger';
import { deleteFileFromS3Job } from '../lib/s3';
import transactionQueueWrapper from '../workers/transactionWrapper';
import referenceData from '../workers/referenceData';

const s3Queue = newQueue('s3');

const addDeleteFileToQueue = (id, key) => {
  // Add delete file job to queue.
  const data = {
    fileId: id,
    fileKey: key,
    key: S3_ACTIONS.DELETE_FILE,
    ...referenceData(),
  };
  return s3Queue.add(S3_ACTIONS.DELETE_FILE, data);
};

const onFailedS3Queue = (job, error) => auditLogger.error(`job ${job.data.key} failed with error ${error}`);
const onCompletedS3Queue = (job, result) => {
  if (result.status === 200 || result.status === 201 || result.status === 202) {
    logger.info(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`);
  } else {
    auditLogger.error(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`);
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
    transactionQueueWrapper(
      deleteFileFromS3Job,
      S3_ACTIONS.DELETE_FILE,
    ),
  );
};

export {
  s3Queue,
  addDeleteFileToQueue,
  onFailedS3Queue,
  onCompletedS3Queue,
  processS3Queue,
};
