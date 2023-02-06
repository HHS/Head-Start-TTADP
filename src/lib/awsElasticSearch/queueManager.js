import newQueue from '../queue';
// import { getClient } from './index';
import { logger } from '../../logger';
import { AWS_ELASTICSEARCH_ACTIONS } from '../../constants';

export const awsElasticsearchQueue = newQueue('awsElasticsearch');

if (awsElasticsearchQueue) {
  awsElasticsearchQueue.on('error', (error) => {
    if (error.name === 'MaxRetriesPerRequestError') {
      logger.error('Max retries per request error');
    }
  });
}

/** *
    Add various AWS Elasticsearch operations to the queue.
    from: src > lib > awsElasticsearch > index.js
** */

/* Schedule Add Index Document to Queue */
const scheduleAddIndexDocumentJob = async (id, type, document) => {
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
};

/* Schedule Update Index Document to Queue */
const scheduleUpdateIndexDocumentJob = async (id, type, document) => {
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
};

/* Schedule Delete Index Document to Queue */
const scheduleDeleteIndexDocumentJob = async (id, type) => {
  logger.info(
    `The 'Add Index Document Job' has been added to the queue for ${type} ID: ${id}`,
  );
  const data = {
    indexName: type,
    id,
    key: AWS_ELASTICSEARCH_ACTIONS.DELETE_INDEX_DOCUMENT,
  };
    // Add index document job to queue.
  awsElasticsearchQueue.add(AWS_ELASTICSEARCH_ACTIONS.DELETE_INDEX_DOCUMENT, data);
};

export {
  scheduleAddIndexDocumentJob,
  scheduleUpdateIndexDocumentJob,
  scheduleDeleteIndexDocumentJob,
};
