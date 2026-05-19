/* eslint-disable no-multi-str */
/* eslint-disable no-console */

import { auditLogger } from '../logger';
import maintainMonitoringData from './maintainMonitoringData';

maintainMonitoringData()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    auditLogger.error(e?.message || String(e), e);
    process.exit(1);
  });
