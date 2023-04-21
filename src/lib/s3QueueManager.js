import newQueue from './queue';
// import { getClient } from './index';
import { logger } from '../logger';
import { S3_ACTIONS } from '../constants';

export const s3Queue = newQueue('s3');

/* Schedule Delete S3 File Job */
const deleteFileJob = async (id, key) => {
  logger.info(
    `The 'deleteFileJob' has been added to the s3 queue for file ID: ${id} KEY: ${key}`,
  );
  // Add delete file job to queue.
  const data = {
    fileId: id,
    fileKey: key,
    key: S3_ACTIONS.DELETE_FILE,
  };
  s3Queue.add(S3_ACTIONS.DELETE_FILE, data);
  return data;
};

export {
  deleteFileJob,
};
