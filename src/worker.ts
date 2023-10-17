/* eslint-disable import/first */
require('newrelic');

import {} from 'dotenv/config';
import throng from 'throng';
import db from './models';
import { logger, auditLogger } from './logger';
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

// Number of workers to spawn
const workers = process.env.WORKER_CONCURRENCY || 2;

// Pull jobs off the redis queue and process them.
async function start() {
  await db.isReady;

  // File Scanning Queue
  processScanQueue();

  // AWS Elasticsearch Queue
  processAWSElasticsearchQueue();

  // S3 Queue.
  processS3Queue();

  // Resource Queue.
  processResourceQueue();

  // Notifications Queue
  processNotificationQueue();

  // Maintenance Queue
  processMaintenanceQueue();
}

// spawn workers and start them
throng({ workers, start });
