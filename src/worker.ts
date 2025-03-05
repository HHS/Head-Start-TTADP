/* eslint-disable import/first */
if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line global-require
  require('newrelic');
}

import {} from 'dotenv/config';
import httpContext from 'express-http-context';
import throng from 'throng';
import { EventEmitter } from 'events';
import env from './env';
import { logger } from './logger';
import { registerEventListener } from './processHandler';
import {
  processScanQueue,
} from './services/scanQueue';
import {
  processResourceQueue,
} from './services/resourceQueue';
import {
  processS3Queue,
} from './services/s3Queue';
import {
  processNotificationQueue,
} from './lib/mailer';
import {
  processMaintenanceQueue,
  executeCronEnrollmentFunctions,
  runMaintenanceCronJobs,
} from './lib/maintenance';

EventEmitter.defaultMaxListeners = 25;

// Number of workers to spawn
const workers = process.env.WORKER_CONCURRENCY || 2;
const timezone = 'America/New_York';

// Wrap your process functions to use httpContext
async function start(context: { id: number }) {
  registerEventListener();

  httpContext.ns.run(async () => {
    httpContext.set('workerId', context.id);

    // File Scanning Queue
    processScanQueue();

    // S3 Queue.
    processS3Queue();

    // Resource Queue.
    processResourceQueue();
    // Notifications Queue
    processNotificationQueue();

    // Ensure only instance zero and the first Throng worker run the maintenance jobs
    logger.info(`Starting worker, cf_instance: ${process.env.CF_INSTANCE_INDEX}, context_id: ${context.id}`);
    if ((process.env.CF_INSTANCE_INDEX === '0' && context.id === 1) || env.bool('FORCE_CRON')) {
      await executeCronEnrollmentFunctions(
        process.env.CF_INSTANCE_INDEX,
        context.id,
        process.env.NODE_ENV,
      );
      runMaintenanceCronJobs(timezone);
    }

    // Maintenance Queue
    processMaintenanceQueue();
  });
}

// spawn workers and start them
throng({ workers, start });
