/* eslint-disable no-console */

import updateMonitoringFactTables from './updateMonitoringFactTables';
import { auditLogger } from '../logger';

updateMonitoringFactTables()
  .then(
    () => { process.exit(0); },
    (e) => { auditLogger.error(e); process.exit(1); },
  );
