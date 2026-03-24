import newQueue, { increaseListeners } from '../lib/queue';
import { RESOURCE_ACTIONS } from '../constants';
import { logger, auditLogger } from '../logger';
import { getResourceMetaDataJob } from '../lib/resource';
import transactionQueueWrapper from '../workers/transactionWrapper';
import referenceData from '../workers/referenceData';

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
    ...referenceData(),
  };
  return resourceQueue.add(RESOURCE_ACTIONS.GET_METADATA, data, {
    attempts: retries,
    backoff: backOffOpts,
    removeOnComplete: true,
    removeOnFail: true,
  });
};

const onFailedResourceQueue = (job, error) => auditLogger.error(`job ${job.data.key} failed with error ${error}`);
const onCompletedResourceQueue = (job, result) => {
  if (result.status === 200 || result.status === 201 || result.status === 202) {
    logger.info(
      `job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`,
    );
  } else {
    auditLogger.error(
      `job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`,
    );
  }
};
const processResourceQueue = () => {
  // Resource Queue.
  resourceQueue.on('failed', onFailedResourceQueue);
  resourceQueue.on('completed', onCompletedResourceQueue);
  increaseListeners(resourceQueue);

  // Get resource metadata.
  resourceQueue.process(
    RESOURCE_ACTIONS.GET_METADATA,
    transactionQueueWrapper(
      getResourceMetaDataJob,
      RESOURCE_ACTIONS.GET_METADATA,
    ),
  );
};

export {
  resourceQueue,
  addGetResourceMetadataToQueue,
  onFailedResourceQueue,
  onCompletedResourceQueue,
  processResourceQueue,
};
