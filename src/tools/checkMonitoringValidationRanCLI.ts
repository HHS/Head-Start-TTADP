/* eslint-disable no-console */

import { auditLogger } from '../logger';
import checkMonitoringValidationRan from './checkMonitoringValidationRan';

checkMonitoringValidationRan().then(
  (result) => {
    // Single greppable line consumed by the CircleCI watchdog job, e.g.:
    // Monitoring Validation Watchdog: {"ok":true,"runId":42,"status":"success",
    //   "startedAt":"2026-07-22T13:05:11.000Z","completedAt":"2026-07-22T13:07:02.000Z",
    //   "alertCount":3}
    // Monitoring Validation Watchdog: {"ok":false,"reason":"no validation run in last 24 hours"}
    console.info(`Monitoring Validation Watchdog: ${JSON.stringify(result)}`);
    process.exit(result.ok ? 0 : 1);
  },
  (e) => {
    auditLogger.error(e);
    console.info(
      `Monitoring Validation Watchdog: ${JSON.stringify({
        ok: false,
        reason: 'watchdog check errored',
      })}`
    );
    process.exit(1);
  }
);
