/* eslint-disable no-multi-str */
/* eslint-disable no-console */

import maintainMonitoringData from './maintainMonitoringData';
import { auditLogger } from '../logger';

maintainMonitoringData()
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
