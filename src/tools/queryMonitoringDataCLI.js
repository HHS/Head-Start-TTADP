/* eslint-disable no-multi-str */
/* eslint-disable no-console */

import queryMonitoringData from './queryMonitoringData';
import { auditLogger } from '../logger';

queryMonitoringData()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  });
