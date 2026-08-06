/* eslint-disable no-console */

import { auditLogger } from '../logger';
import validateMonitoringGate from './validateMonitoringGate';
import { resolveGateHalt } from './validation/gateHaltPolicy';

// The runner reports; this CLI is the only thing that can actually stop the newly
// imported data from flowing into the fact tables the app reads (it runs before
// update_fact_tables and a nonzero exit breaks the phase loop, leaving the prior
// fact tables live). Whether a critical halts is controlled by the
// MONITORING_GATE_HALT_CHECKS env var (report-only by default). See resolveGateHalt
// and the "Enforcement controls" section of docs/monitoring-data-validation.md. The
// greppable "Monitoring Gate: {...}" line printed by the runner carries the details
// to Slack regardless.
validateMonitoringGate().then(
  (result) => {
    const { criticalChecks, haltingChecks, shouldHalt } = resolveGateHalt(
      result.alerts,
      process.env.MONITORING_GATE_HALT_CHECKS
    );

    if (criticalChecks.length > 0) {
      auditLogger.warn(
        `Monitoring gate: ${criticalChecks.length} critical alert(s) on run ${result.runId} [${criticalChecks.join(', ')}]`
      );
    }

    if (shouldHalt) {
      auditLogger.error(
        `Monitoring gate blocked the fact-table refresh: ${haltingChecks.join(', ')} on run ${result.runId}`
      );
      process.exit(1);
    }

    if (criticalChecks.length > 0) {
      auditLogger.warn(
        'Monitoring gate is in report-only mode for the above critical(s); the fact-table refresh will proceed.'
      );
    }
    process.exit(0);
  },
  (e) => {
    auditLogger.error(e);
    process.exit(1);
  }
);
