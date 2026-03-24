/* eslint-disable no-multi-str */
/* eslint-disable no-console */

import { auditLogger } from '../logger';
import maintainMonitoringData from './maintainMonitoringData';

maintainMonitoringData()
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
