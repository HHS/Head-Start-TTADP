import newQueue from '../queue';
import { getClient } from './index';
import formatModelForAwsElasticsearch from './indexFormatter';
import models from '../../models';
import { logger } from '../../logger';
import { AWS_ELASTICSEARCH_ACTIONS } from '../../constants';

export const awsElasticsearchQueue = newQueue('awsElasticsearch');
let client;

/** *
    Add various AWS Elasticsearch operations to the queue.
** */

/* Add Index Document to Queue */
export async function scheduleAddIndexDocumentJob(instance) {
  const modelName = instance.constructor.name;
  const modelType = models[modelName];
  if (!modelType) {
    throw new Error(`Model ${instance.constructor.name} was not found`);
  }

  // Get client if we don't have one yet.
  client = client || await getClient();

  logger.info(
    `The 'Add Index Document Job' has been added to the queue for ${modelName} ID: ${instance.id}`,
  );

  // Add index document job to queue.
  awsElasticsearchQueue.add(AWS_ELASTICSEARCH_ACTIONS.ADD_INDEX_DOCUMENT, {
    indexName: modelName,
    id: instance.id,
    document: await formatModelForAwsElasticsearch(instance),
    passedClient: client,
  });

  return null;
}
