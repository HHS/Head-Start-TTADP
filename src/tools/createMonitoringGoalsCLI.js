import { auditLogger } from '../logger';
import createMonitoringGoals from './createMonitoringGoals';

createMonitoringGoals()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    auditLogger.error(e?.message || String(e), e);
    process.exit(1);
  });
