import updateCompletedTrainingReports from './updateCompletedTrainingReports';
import { auditLogger } from '../logger';

updateCompletedTrainingReports().catch((e) => {
  auditLogger.error(e);
  return process.exit(1);
}).then(() => process.exit(0));
