/* eslint-disable no-console */
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { auditLogger } from '../logger';
import {
  type DigestFrequency,
  sendTestMonitoringNotifications,
} from './sendTestMonitoringNotifications';

/**
 * Sends the monitoring report emails to specific users in dev or staging. Refuses to run in
 * production. Example (cloud.gov):
 *   cf run-task tta-smarthub-staging --name monitoring-email-test \
 *     --command "yarn cli:send-test-monitoring-notifications --userId 123 --type both --freq WEEKLY"
 */
const argv = yargs(hideBin(process.argv))
  .option('userId', {
    alias: 'u',
    description: 'User ID to email; repeat for several users',
    type: 'number',
    array: true,
    demandOption: true,
  })
  .option('type', {
    alias: 't',
    description: 'Which email to send',
    choices: ['immediate', 'digest', 'both'] as const,
    default: 'both' as const,
  })
  .option('freq', {
    alias: 'f',
    description: 'Digest frequency',
    choices: ['DAILY', 'WEEKLY', 'MONTHLY'] as const,
    default: 'DAILY' as const,
  })
  .option('deliveredReviewId', {
    alias: 'r',
    description: 'DeliveredReviews.id to use (defaults to the most recently delivered review)',
    type: 'number',
  })
  .strict()
  .help()
  .parseSync();

sendTestMonitoringNotifications({
  userIds: argv.userId,
  type: argv.type,
  freq: argv.freq as DigestFrequency,
  deliveredReviewId: argv.deliveredReviewId,
}).then(
  (results) => {
    results.forEach(({ kind, userId, sent, detail }) => {
      console.info(`${sent ? 'SENT' : 'NOT SENT'} ${kind} email to user ${userId}: ${detail}`);
    });
    process.exit(results.every(({ sent }) => sent) ? 0 : 1);
  },
  (err) => {
    auditLogger.error(err);
    process.exit(1);
  }
);
