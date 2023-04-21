import newQueue from '../lib/queue';

const s3Queue = newQueue('s3');
const addToS3Queue = (fileKey) => {
  const retries = process.env.FILE_SCAN_RETRIES || 5;
  const delay = process.env.FILE_SCAN_BACKOFF_DELAY || 10000;
  const backOffOpts = {
    type: 'exponential',
    delay,
  };

  return s3Queue.add(
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
  s3Queue,
};
export default addToS3Queue;
