import {} from 'dotenv/config';
import { option } from 'yargs';
import { auditLogger } from '../logger';
import addMonitoringGoalForGrant from './addMonitoringGoalForGrant';

const { argv } = option('grantId', {
  alias: 'g',
  description: 'Grant id',
  type: 'number',
})
  .help()
  .alias('help', 'h');

const { grantId } = argv;

if (!grantId) {
  auditLogger.error('grantId is required');
  process.exit(1);
}

addMonitoringGoalForGrant(grantId)
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
