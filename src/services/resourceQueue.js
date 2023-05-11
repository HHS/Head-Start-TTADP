import newQueue from '../lib/queue';
import { RESOURCE_ACTIONS } from '../constants';
import { auditLogger } from '../logger';

const resourceQueue = newQueue('resource');

const addGetResourceMetadataToQueue = (id, url) => {
  const retries = process.env.RESOURCE_METADATA_RETRIES || 3;
  const delay = process.env.RESOURCE_METADATA_BACKOFF_DELAY || 10000;
  const backOffOpts = {
    type: 'exponential',
    delay,
  };

  const data = {
    resourceId: id,
    resourceUrl: url,
    key: RESOURCE_ACTIONS.GET_METADATA,
  };
  return resourceQueue.add(
    RESOURCE_ACTIONS.GET_METADATA,
    data,
    {
      attempts: retries,
      backoff: backOffOpts,
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
};

export {
  resourceQueue,
  addGetResourceMetadataToQueue,
};
