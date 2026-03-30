/* eslint-disable no-multi-str */
/* eslint-disable no-console */

import maintainMonitoringData from './maintainMonitoringData';
import { auditLogger } from '../logger';

maintainMonitoringData()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  });
