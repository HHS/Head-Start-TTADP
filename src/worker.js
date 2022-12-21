/* eslint-disable import/first */
require('newrelic');

import {} from 'dotenv/config';
import throng from 'throng';
import { logger, auditLogger } from './logger';
import { scanQueue } from './services/scanQueue';
import { awsElasticsearchQueue } from './lib/awsElasticSearch/queueManager';
import processFile from './workers/files';
import {
  notifyApproverAssigned,
  notifyChangesRequested,
  notifyReportApproved,
  notifyCollaboratorAssigned,
  notificationQueue,
  notifyDigest,
  notificationDigestQueue,
  notifyRecipientReportApproved,
} from './lib/mailer';

import {
  addIndexDocument,
  updateIndexDocument,
  deleteIndexDocument,
} from './lib/awsElasticSearch';
import { EMAIL_ACTIONS, AWS_ELASTICSEARCH_ACTIONS } from './constants';
import logEmailNotification, { logDigestEmailNotification } from './lib/mailer/logNotifications';

// Number of workers to spawn
const workers = process.env.WORKER_CONCURRENCY || 2;
// Number of jobs per worker. Can be adjusted if clamav is getting bogged down
const maxJobsPerWorker = process.env.MAX_JOBS_PER_WORKER || 5;

// Pull jobs off the redis queue and process them.
async function start() {
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

  // AWS Elasticsearch
  awsElasticsearchQueue.on('failed', (job, error) => auditLogger.error(`job ${job.data.key} failed with error ${error}`));
  awsElasticsearchQueue.on('completed', (job, result) => {
    if (result.status === 200) {
      logger.info(`job ${job.data.key} completed with status ${result.status} and result ${result.data}`);
    } else {
      auditLogger.error(`job ${job.data.key} completed with status ${result.status} and result ${result.data}`);
    }
  });
  // Process AWS Elasticsearch Queue Items:
  // Create Index Document
  awsElasticsearchQueue.process(AWS_ELASTICSEARCH_ACTIONS.ADD_INDEX_DOCUMENT, addIndexDocument);
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

  // Notifications
  notificationQueue.on('failed', (job, error) => {
    auditLogger.error(`job ${job.name} failed for report ${job.data.report.displayId} with error ${error}`);
    logEmailNotification(job, false, error);
  });
  notificationQueue.on('completed', (job, result) => {
    if (result != null) {
      logger.info(`Successfully sent ${job.name} notification for ${job.data.report.displayId}`);
      logEmailNotification(job, true, result);
    } else {
      logger.info(`Did not send ${job.name} notification for ${job.data.report.displayId} preferences are not set`);
      logEmailNotification(job, false, { preferences: 'off' });
    }
  });
  // Digests
  notificationDigestQueue.on('failed', (job, error) => {
    auditLogger.error(`job ${job.name} failed for user ${job.data.user.id} with error ${error}`);
    logDigestEmailNotification(job, false, error);
  });
  notificationDigestQueue.on('completed', (job, result) => {
    if (result != null) {
      logger.info(`Successfully sent ${job.name} notification for ${job.data.user.id}`);
      logDigestEmailNotification(job, true, result);
    } else {
      logger.info(`Did not send ${job.name} notification for ${job.data.user.id} because SEND_NOTIFICATIONS is not set`);
      logDigestEmailNotification(job, false, { SEND_NOTIFICATIONS: 'off' });
    }
  });

  notificationQueue.process(EMAIL_ACTIONS.NEEDS_ACTION, notifyChangesRequested);
  notificationQueue.process(EMAIL_ACTIONS.SUBMITTED, notifyApproverAssigned);
  notificationQueue.process(EMAIL_ACTIONS.APPROVED, notifyReportApproved);
  notificationQueue.process(EMAIL_ACTIONS.COLLABORATOR_ADDED, notifyCollaboratorAssigned);
  notificationQueue.process(EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED, notifyRecipientReportApproved);

  notificationDigestQueue.process(EMAIL_ACTIONS.NEEDS_ACTION_DIGEST, notifyDigest);
  notificationDigestQueue.process(EMAIL_ACTIONS.SUBMITTED_DIGEST, notifyDigest);
  notificationDigestQueue.process(EMAIL_ACTIONS.APPROVED_DIGEST, notifyDigest);
  notificationDigestQueue.process(EMAIL_ACTIONS.COLLABORATOR_DIGEST, notifyDigest);
  notificationDigestQueue.process(EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED_DIGEST, notifyDigest);
}

// spawn workers and start them
throng({ workers, start });
