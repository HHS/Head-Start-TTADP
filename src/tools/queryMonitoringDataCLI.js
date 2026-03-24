/* eslint-disable no-multi-str */
/* eslint-disable no-console */

import { auditLogger } from '../logger';
import queryMonitoringData from './queryMonitoringData';

queryMonitoringData()
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
