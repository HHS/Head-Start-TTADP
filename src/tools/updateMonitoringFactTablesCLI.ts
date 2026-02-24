/* eslint-disable no-console */

import updateMonitoringFactTables from './updateMonitoringFactTables';
import { auditLogger } from '../logger';

updateMonitoringFactTables()
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
