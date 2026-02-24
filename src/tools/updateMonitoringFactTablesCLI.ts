/* eslint-disable no-console */

import updateMonitoringFactTables from './updateMonitoringFactTables';
import { auditLogger } from '../logger';

updateMonitoringFactTables()
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
