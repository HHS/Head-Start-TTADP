import { option } from 'yargs';
import { auditLogger } from '../logger';
import changeActivityReportObjectiveStatus, {
  parseActivityReportObjectiveId,
  parseObjectiveStatus,
} from './changeActivityReportObjectiveStatus';

const { argv } = option('id', {
  alias: 'i',
  description: 'ActivityReportObjective id to change status',
  type: 'string',
})
  .option('status', {
    alias: 's',
    description: 'new objective status',
    type: 'string',
  })
  .help()
  .alias('help', 'h');

const { id, status } = argv;

if (!parseActivityReportObjectiveId(id)) {
  auditLogger.error('Please provide a valid ActivityReportObjective id. Type -h for help');
  process.exit(1);
}

if (!parseObjectiveStatus(status)) {
  auditLogger.error('Please provide a valid objective status. Type -h for help');
  process.exit(1);
}

changeActivityReportObjectiveStatus(id, status)
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  });
