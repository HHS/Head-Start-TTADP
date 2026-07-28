/* eslint-disable no-console */

import { auditLogger } from '../logger';
import validateMonitoringGate from './validateMonitoringGate';

// Exit nonzero on any critical alert so the CI import phase loop breaks before
// update_fact_tables runs (see .circleci/config.yml). A non-critical run - alerts
// only, or clean - exits 0 and the import proceeds. The greppable "Monitoring
// Gate: {...}" line printed by the runner carries the block reason to Slack.
validateMonitoringGate().then(
  (result) => {
    if (result.criticalCount > 0) {
      auditLogger.error(
        `Monitoring gate blocked the fact-table refresh: ${result.criticalCount} critical alert(s) on run ${result.runId}`
      );
      process.exit(1);
    }
    process.exit(0);
  },
  (e) => {
    auditLogger.error(e);
    process.exit(1);
  }
);
