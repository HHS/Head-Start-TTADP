/* eslint-disable import/first */
require('newrelic');

import {} from 'dotenv/config';
import throng from 'throng';
import { logger, auditLogger } from './logger';
import { scanQueue } from './services/scanQueue';
import processFile from './workers/files';
import {
  notifyApproverAssigned,
  notifyChangesRequested,
  notifyReportApproved,
  notificationQueue,
  notifyCollaboratorAssigned,
} from './lib/mailer';

// Number of workers to spawn
const workers = process.env.WORKER_CONCURRENCY || 2;
// Number of jobs per worker. Can be adjusted if clamav is getting bogged down
const maxJobsPerWorker = process.env.MAX_JOBS_PER_WORKER || 5;

// Pull jobs off the redis queue and process them.
function start() {
  // File Scanning
  scanQueue.on('failed', (job, error) => auditLogger.error(`job ${job.data.key} failed with error ${error}`));
  scanQueue.on('completed', (job, result) => {
    if (result.status === 200) {
      logger.info(`job ${job.data.key} completed with status ${result.status} and result ${result.data}`);
    } else {
      auditLogger.error(`job ${job.data.key} completed with status ${result.status} and result ${result.data}`);
    }
  });
  scanQueue.process(maxJobsPerWorker, (job) => processFile(job.data.key));

  // Notifications
  notificationQueue.on('failed', (job, error) => auditLogger
    .error(`job ${job.name} failed for report ${job.data.report.displayId} with error ${error}`));
  notificationQueue.on('completed', (job, result) => {
    if (result != null) {
      logger.info(`Succesfully sent ${job.name} notification for ${job.data.report.displayId}`);
    } else {
      logger.info(`Did not send ${job.name} notification for ${job.data.report.displayId} because SEND_NOTIFICATIONS is not set`);
    }
  });

  notificationQueue.process('changesRequested', notifyChangesRequested);
  notificationQueue.process('approverAssigned', notifyApproverAssigned);
  notificationQueue.process('reportApproved', notifyReportApproved);
  notificationQueue.process('collaboratorAssigned', notifyCollaboratorAssigned);
}

// spawn workers and start them
throng({ workers, start });
