import newQueue from '../lib/queue';
import { RESOURCE_ACTIONS } from '../constants';

const resourceQueue = newQueue('resource');
const addToResourceQueue = (id, url) => {
  const retries = process.env.FILE_SCAN_RETRIES || 5;
  const delay = process.env.FILE_SCAN_BACKOFF_DELAY || 10000;
  const backOffOpts = {
    type: 'exponential',
    delay,
  };
  return resourceQueue.add(
    RESOURCE_ACTIONS.GET_METADATA,
    {
      id,
      url,
      key: RESOURCE_ACTIONS.GET_METADATA,
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
