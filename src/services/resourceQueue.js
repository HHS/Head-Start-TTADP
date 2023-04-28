import newQueue from '../lib/queue';
import { RESOURCE_ACTIONS } from '../constants';

const resourceQueue = newQueue('resource');

const addGetResourceMetadataToQueue = (id, url) => {
  const data = {
    resourceId: id,
    resourceUrl: url,
    key: RESOURCE_ACTIONS.GET_METADATA,
  };
  resourceQueue.add(RESOURCE_ACTIONS.GET_METADATA, data);
  return data;
};

export {
  resourceQueue,
  addGetResourceMetadataToQueue,
};
