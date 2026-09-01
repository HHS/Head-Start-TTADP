/* eslint-disable no-console */

import { auditLogger } from '../logger';
import validateMonitoringData from './validateMonitoringData';

validateMonitoringData().then(
  () => {
    process.exit(0);
  },
  (e) => {
    auditLogger.error(e);
    process.exit(1);
  }
);
