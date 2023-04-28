import newQueue from '../lib/queue';
import { RESOURCE_ACTIONS } from '../constants';
import { auditLogger } from '../logger';

const resourceQueue = newQueue('resource');

const addGetResourceMetadataToQueue = (id, url) => {
  let data;
  try {
    data = {
      resourceId: id,
      resourceUrl: url,
      key: RESOURCE_ACTIONS.GET_METADATA,
    };
    resourceQueue.add(RESOURCE_ACTIONS.GET_METADATA, data);
  } catch (error) {
    auditLogger.error('\n\n\n--ERROR: ', error);
  }
  return data;
};

export {
  resourceQueue,
  addGetResourceMetadataToQueue,
};
