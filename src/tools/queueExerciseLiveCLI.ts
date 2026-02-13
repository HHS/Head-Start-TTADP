import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { runQueueExerciseLive } from './queueExerciseLive';
import { auditLogger } from '../logger';

const argv = yargs(hideBin(process.argv))
  .option('region', {
    alias: 'r',
    description: 'Target region ID for generated test entities (auto-selected if omitted)',
    type: 'number',
  })
  .option('ownerUserId', {
    alias: 'o',
    description: 'Owner user ID (auto-selected from eligible users if omitted)',
    type: 'number',
  })
  .option('collaboratorUserId', {
    alias: 'c',
    description: 'Collaborator user ID to trigger collaborator notification flow (auto-selected if omitted)',
    type: 'number',
  })
  .option('resourceUrl', {
    alias: 'u',
    description: 'Resource URL base used to trigger metadata queue flow',
    type: 'string',
  })
  .option('timeoutSec', {
    alias: 't',
    description: 'Per-stage timeout in seconds',
    type: 'number',
    default: 300,
  })
  .option('pollMs', {
    alias: 'p',
    description: 'Polling interval in milliseconds',
    type: 'number',
    default: 5000,
  })
  .option('keepData', {
    alias: 'k',
    description: 'Keep generated test data (skip cleanup)',
    type: 'boolean',
    default: false,
  })
  .option('json', {
    alias: 'j',
    description: 'Output JSON summary',
    type: 'boolean',
    default: true,
  })
  .help()
  .alias('help', 'h')
  .parseSync();

const output = (value) => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

runQueueExerciseLive({
  region: argv.region,
  ownerUserId: argv.ownerUserId,
  collaboratorUserId: argv.collaboratorUserId,
  resourceUrl: argv.resourceUrl,
  timeoutSec: argv.timeoutSec,
  pollMs: argv.pollMs,
  keepData: argv.keepData,
})
  .then((summary) => {
    if (argv.json) {
      output(summary);
    }

    if (!summary.preflight.passed) {
      process.exit(2);
    }

    process.exit(summary.passed ? 0 : 1);
  })
  .catch((error) => {
    auditLogger.error(error);
    process.exit(2);
  });
