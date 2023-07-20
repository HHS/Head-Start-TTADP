import newQueue from '../lib/queue';
import { S3_ACTIONS } from '../constants';
import { logger, auditLogger } from '../logger';
import { deleteFileFromS3Job } from '../lib/s3';

const s3Queue = newQueue('s3');

const addDeleteFileToQueue = (id, key) => {
  // Add delete file job to queue.
  const data = {
    fileId: id,
    fileKey: key,
    key: S3_ACTIONS.DELETE_FILE,
  };
  s3Queue.add(S3_ACTIONS.DELETE_FILE, data);
  return data;
};

const onFailedS3Queue = (job, error) => auditLogger.error(`job ${job.data.key} failed with error ${error}`);
const onCompletedS3Queue = (job, result) => {
  if (result.status === 200 || result.status === 201 || result.status === 202) {
    logger.info(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`);
  } else {
    auditLogger.error(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`);
  }
};
const processS3Queue = async () => {
  // S3 Queue.
  s3Queue.on('failed', onFailedS3Queue);
  s3Queue.on('completed', onCompletedS3Queue);

  // Delete S3 file.
  return s3Queue.process(
    S3_ACTIONS.DELETE_FILE,
    deleteFileFromS3Job,
  );
};

export {
  s3Queue,
  addDeleteFileToQueue,
  onFailedS3Queue,
  onCompletedS3Queue,
  processS3Queue,
};
