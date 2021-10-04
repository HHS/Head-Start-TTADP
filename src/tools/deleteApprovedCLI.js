import { option } from 'yargs';
import deleteApproved from './deleteApproved';
import { auditLogger } from '../logger';

const { argv } = option('ids', {
  alias: 'i',
  description: 'activity report id\'s to delete',
  type: 'string',
})
  .help()
  .alias('help', 'h');

const { ids } = argv;

if (!ids) {
  auditLogger.error('Please provide at least one id. Type -h for help');
  process.exit(1);
}

deleteApproved(ids).catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
