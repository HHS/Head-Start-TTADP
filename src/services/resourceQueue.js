import newQueue from '../lib/queue';

const resourceQueue = newQueue('resource');
const addToResourceQueue = (id, url) => {
  const retries = process.env.FILE_SCAN_RETRIES || 5;
  const delay = process.env.FILE_SCAN_BACKOFF_DELAY || 10000;
  const backOffOpts = {
    type: 'exponential',
    delay,
  };
  return resourceQueue.add(
    'resourceMetadata',
    {
      id,
      url,
      key: 'resourceMetadata',
      attempts: retries,
      backoff: backOffOpts,
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
};

export {
  resourceQueue,
  addToResourceQueue,
};
