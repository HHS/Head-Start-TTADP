import newQueue from '../lib/queue';

const scanQueue = newQueue('scan');
const addToScanQueue = (fileKey) => {
  const retries = process.env.FILE_SCAN_RETRIES || 5;
  const delay = process.env.FILE_SCAN_BACKOFF_DELAY || 10000;
  const backOffOpts = {
    type: 'exponential',
    delay,
  };

  return scanQueue.add(
    fileKey,
    {
      attempts: retries,
      backoff: backOffOpts,
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
};

export {
  scanQueue,
};
export default addToScanQueue;
