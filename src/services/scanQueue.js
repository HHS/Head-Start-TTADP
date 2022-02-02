import newQueue from '../lib/queue';

const scanQueue = newQueue('scan');
const addToScanQueue = (fileKey) => {
  const retries = process.env.FILE_SCAN_RETRIES || 5;
  const delay = process.env.FILE_SCAN_BACKOFF_DELAY || 10000;
  const backOffOpts = {
    type: 'exponential',
    delay,
  };

  const jobOptions = {
    removeOnComplete: true,
    removeOnFail: true,
  };

  return scanQueue.add(
    fileKey,
    { attempts: retries, backoff: backOffOpts },
    jobOptions,
  );
};

export {
  scanQueue,
};
export default addToScanQueue;
