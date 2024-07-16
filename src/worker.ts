/* eslint-disable import/first */
if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line global-require
  require('newrelic');
}

import {} from 'dotenv/config';
import throng from 'throng';
import httpContext from 'express-http-context';
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
} from './lib/maintenance';

// Number of workers to spawn
const workers = process.env.WORKER_CONCURRENCY || 2;

// Wrap your process functions to use httpContext
async function start(context: { id: number }) {
  httpContext.ns.run(() => {
    httpContext.set('workerId', context.id);

    // File Scanning Queue
    processScanQueue();

    // S3 Queue.
    processS3Queue();

    // Resource Queue.
    processResourceQueue();

    // Notifications Queue
    processNotificationQueue();

    // Maintenance Queue
    processMaintenanceQueue();
  });
}

// spawn workers and start them
throng({ workers, start });
