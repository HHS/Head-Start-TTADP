/* eslint-disable no-console */

import { auditLogger } from '../logger';
import updateMonitoringFactTables from './updateMonitoringFactTables';

updateMonitoringFactTables().then(
  () => {
    process.exit(0);
  },
  (e) => {
    auditLogger.error(e?.message || String(e), e);
    process.exit(1);
  }
);
