/* eslint-disable no-multi-str */
/* eslint-disable no-console */

import queryMonitoringData from './queryMonitoringData';
import { auditLogger } from '../logger';

queryMonitoringData()
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
