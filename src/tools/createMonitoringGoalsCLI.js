import createMonitoringGoals from './createMonitoringGoals';
import { auditLogger } from '../logger';

createMonitoringGoals()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  });
