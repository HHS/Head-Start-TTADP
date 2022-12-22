import newQueue from '../queue';
// import { getClient } from './index';
import { logger } from '../../logger';
import { AWS_ELASTICSEARCH_ACTIONS } from '../../constants';

export const awsElasticsearchQueue = newQueue('awsElasticsearch');
// let client;

/** *
    Add various AWS Elasticsearch operations to the queue.
    from: src > lib > awsElasticsearch > index.js
** */

/* Schedule Add Index Document to Queue */
const scheduleAddIndexDocumentJob = async (id, type, document) => {
  if (document) {
    logger.info(
      `The 'Add Index Document Job' has been added to the queue for ${type} ID: ${id}`,
    );
    // Add index document job to queue.
    const data = {
      indexName: type,
      id,
      document,
      key: AWS_ELASTICSEARCH_ACTIONS.ADD_INDEX_DOCUMENT,
    };
    awsElasticsearchQueue.add(AWS_ELASTICSEARCH_ACTIONS.ADD_INDEX_DOCUMENT, data);
    return data;
  }
  return null;
};

/* Schedule Update Index Document to Queue */
const scheduleUpdateIndexDocumentJob = async (id, type, document) => {
  if (document) {
    logger.info(
      `The 'Add Index Document Job' has been added to the queue for ${type} ID: ${id}`,
    );

    // Add index document job to queue.
    const data = {
      indexName: type,
      id,
      body: { doc: { ...document } },
      key: AWS_ELASTICSEARCH_ACTIONS.UPDATE_INDEX_DOCUMENT,
    };
    awsElasticsearchQueue.add(AWS_ELASTICSEARCH_ACTIONS.UPDATE_INDEX_DOCUMENT, data);
    return data;
  }
  return null;
};

/* Schedule Delete Index Document to Queue */
const scheduleDeleteIndexDocumentJob = async (id, type) => {
  if (id && type) {
    logger.info(
      `The 'Add Index Document Job' has been added to the queue for ${type} ID: ${id}`,
    );
    const data = {
      indexName: type,
      id,
      type: AWS_ELASTICSEARCH_ACTIONS.DELETE_INDEX_DOCUMENT,
    };
    // Add index document job to queue.
    awsElasticsearchQueue.add(AWS_ELASTICSEARCH_ACTIONS.DELETE_INDEX_DOCUMENT, data);
  }
  return null;
};

export {
  scheduleAddIndexDocumentJob,
  scheduleUpdateIndexDocumentJob,
  scheduleDeleteIndexDocumentJob,
};
