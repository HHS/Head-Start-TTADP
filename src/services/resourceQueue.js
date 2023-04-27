/* eslint-disable no-console */
import newQueue from '../lib/queue';

const resourceQueue = newQueue('resource');
const addToResourceQueue = (resourceId) => {
  let returnV;
  try {
    const retries = process.env.FILE_SCAN_RETRIES || 5;
    const delay = process.env.FILE_SCAN_BACKOFF_DELAY || 10000;
    const backOffOpts = {
      type: 'exponential',
      delay,
    };
    returnV = resourceQueue.add(
      resourceId,
      {
        attempts: retries,
        backoff: backOffOpts,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  } catch (err) {
    console.log('\n\n\n--ADD TO QUEUE: ', err);
  }

  return returnV;
};

export {
  resourceQueue,
  addToResourceQueue,
};
