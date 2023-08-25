import newQueue, { increaseListeners } from '../lib/queue';
import { RESOURCE_ACTIONS } from '../constants';
import { logger, auditLogger } from '../logger';
import { getResourceMetaDataJob } from '../lib/resource';

const resourceQueue = newQueue('resource');

const addGetResourceMetadataToQueue = async (id, url) => {
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

const onFailedResourceQueue = async (job, error) => {
  auditLogger.error(`job ${job.data.key} failed with error ${error}`);
  await job.retry();
};
const onCompletedResourceQueue = async (job, result) => {
  if (result.status === 200 || result.status === 201 || result.status === 202) {
    logger.info(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`);
  } else {
    auditLogger.error(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`);
    await job.retry();
  }
};
const processResourceQueue = () => {
  // Resource Queue.
  resourceQueue.on('failed', onFailedResourceQueue);
  resourceQueue.on('completed', onCompletedResourceQueue);
  increaseListeners(resourceQueue);

  // Get resource metadata.
  return resourceQueue.process(
    RESOURCE_ACTIONS.GET_METADATA,
    getResourceMetaDataJob,
  );
};

export {
  resourceQueue,
  addGetResourceMetadataToQueue,
  onFailedResourceQueue,
  onCompletedResourceQueue,
  processResourceQueue,
};
