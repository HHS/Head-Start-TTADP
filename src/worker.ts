/* eslint-disable global-require */
if (process.env.NODE_ENV === 'production') {
  /* eslint-disable import/first */
  require('newrelic');
}

import {} from 'dotenv/config';
import throng from 'throng';
import { logger } from './logger';
import {
  processScanQueue,
} from './services/scanQueue';
import {
  processResourceQueue,
} from './services/resourceQueue';
import {
  processAWSElasticsearchQueue,
} from './lib/awsElasticSearch/queueManager';
import {
  processS3Queue,
} from './services/s3Queue';
import {
  processNotificationQueue,
} from './lib/mailer';
import {
  processMaintenanceQueue,
} from './lib/maintenance';

const processors = [
  // File Scanning Queue
  processScanQueue,

  // AWS Elasticsearch Queue
  processAWSElasticsearchQueue,

  // S3 Queue.
  processS3Queue,

  // Resource Queue.
  processResourceQueue,

  // Notifications Queue
  processNotificationQueue,

  // Maintenance Queue
  processMaintenanceQueue,
];

// Number of workers to spawn
const workers = process.env.WORKER_CONCURRENCY || 2;

// Pull jobs off the redis queue and process them.
async function workerStart() {
  logger.info('Worker started');
  processors.forEach((processor) => processor());
}

// spawn workers and start them
throng({ workers, start: workerStart });
