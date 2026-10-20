/* eslint-disable no-console */

import { auditLogger } from '../logger';
import updateMonitoringFactTables from './updateMonitoringFactTables';

updateMonitoringFactTables().then(
  () => {
    process.exit(0);
  },
  (e) => {
    auditLogger.error(e);
    process.exit(1);
  }
);
