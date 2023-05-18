/* eslint-disable import/first */
require('newrelic');

import {} from 'dotenv/config';
import throng from 'throng';
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
  processNotificationDigestQueue,
} from './lib/mailer';

// Number of workers to spawn
const workers = process.env.WORKER_CONCURRENCY || 2;
// Number of jobs per worker. Can be adjusted if clamav is getting bogged down
const maxJobsPerWorker = Number(process.env.MAX_JOBS_PER_WORKER) || 1;

// Pull jobs off the redis queue and process them.
async function start() {
  // File Scanning Queue
  processScanQueue(maxJobsPerWorker);

  // AWS Elasticsearch Queue
  processAWSElasticsearchQueue();

  // S3 Queue.
  processS3Queue();

  // Resource Queue.
  processResourceQueue();

  // Notifications Queue
  processNotificationQueue();
  // NotificationsDigests Queue
  processNotificationDigestQueue();
}

// spawn workers and start them
throng({ workers, start });
