import { auditLogger } from '../logger';
import updateCompletedEventReportPilots from './updateCompletedEventReportPilots';

updateCompletedEventReportPilots()
  .catch((e) => {
    auditLogger.error(e?.message || String(e), e);
    return process.exit(1);
  })
  .then(() => process.exit(0));
