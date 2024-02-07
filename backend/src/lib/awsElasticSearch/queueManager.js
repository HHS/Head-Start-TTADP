import newQueue, { increaseListeners } from '../queue';
// import { getClient } from './index';
import { logger, auditLogger } from '../../logger';
import { AWS_ELASTICSEARCH_ACTIONS } from '../../constants';
import {
  addIndexDocument,
  updateIndexDocument,
  deleteIndexDocument,
} from '.';

export const awsElasticsearchQueue = newQueue('awsElasticsearch');

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

const onFailedAWSElasticsearchQueue = (job, error) => auditLogger.error(`job ${job.data.key} failed with error ${error}`);
const onCompletedAWSElasticsearchQueue = (job, result) => {
  if (result.status === 200 || result.status === 201 || result.status === 202) {
    logger.info(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`);
  } else {
    auditLogger.error(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`);
  }
};
const processAWSElasticsearchQueue = () => {
  // AWS Elasticsearch
  awsElasticsearchQueue.on('failed', onFailedAWSElasticsearchQueue);
  awsElasticsearchQueue.on('completed', onCompletedAWSElasticsearchQueue);
  increaseListeners(awsElasticsearchQueue, 3);
  // Process AWS Elasticsearch Queue Items:
  // Create Index Document
  awsElasticsearchQueue.process(
    AWS_ELASTICSEARCH_ACTIONS.ADD_INDEX_DOCUMENT,
    addIndexDocument,
  );
  // Update Index Document
  awsElasticsearchQueue.process(
    AWS_ELASTICSEARCH_ACTIONS.UPDATE_INDEX_DOCUMENT,
    updateIndexDocument,
  );
  // Delete Index Document
  awsElasticsearchQueue.process(
    AWS_ELASTICSEARCH_ACTIONS.DELETE_INDEX_DOCUMENT,
    deleteIndexDocument,
  );
};

export {
  scheduleAddIndexDocumentJob,
  scheduleUpdateIndexDocumentJob,
  scheduleDeleteIndexDocumentJob,
  onFailedAWSElasticsearchQueue,
  onCompletedAWSElasticsearchQueue,
  processAWSElasticsearchQueue,
};
