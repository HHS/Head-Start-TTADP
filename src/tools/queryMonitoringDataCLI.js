/* eslint-disable no-multi-str */
/* eslint-disable no-console */

import runQuery from './queryMonitoringData';
import { auditLogger } from '../logger';

runQuery().catch((e) => {
  auditLogger.error(e);
  return process.exit(1);
});
