import { auditLogger } from '../logger';
import createMonitoringGoals from './createMonitoringGoals';

createMonitoringGoals()
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
