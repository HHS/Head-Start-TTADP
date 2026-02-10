import {} from 'dotenv/config';
import { option } from 'yargs';
import addMonitoringGoalForGrant from './addMonitoringGoalForGrant';
import { auditLogger } from '../logger';

const { argv } = option('grantId', {
  alias: 'g',
  description: 'Grant id',
  type: 'number',
})
  .option('status', {
    alias: 's',
    description: 'Goal status (default: Not Started)',
    type: 'string',
  })
  .help()
  .alias('help', 'h');

const { grantId, status } = argv;

if (!grantId) {
  auditLogger.error('grantId is required');
  process.exit(1);
}

addMonitoringGoalForGrant(grantId, status)
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
