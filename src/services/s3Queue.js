import newQueue from '../lib/queue';
import { S3_ACTIONS } from '../constants';

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

export {
  s3Queue,
  addDeleteFileToQueue,
};
