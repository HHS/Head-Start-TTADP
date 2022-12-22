import { option } from 'yargs';
import changeReportStatus from './changeReportStatus';
import { auditLogger } from '../logger';
import { REPORT_STATUSES } from '../constants';

const { argv } = option('ids', {
  alias: 'i',
  description: 'comma separated activity report id\'s to change status',
  type: 'string',
}).option('status', {
  alias: 's',
  description: `new status (${Object.keys(REPORT_STATUSES)})`,
  type: 'string',
})
  .help()
  .alias('help', 'h');

const { ids, status } = argv;

if (!ids) {
  auditLogger.error('Please provide at least one id. Type -h for help');
  process.exit(1);
}

if (!status || !Object.keys(REPORT_STATUSES).includes(status.toUpperCase())) {
  auditLogger.error('Please provide a valid new status. Type -h for help');
  process.exit(1);
}

changeReportStatus(ids, status).catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
