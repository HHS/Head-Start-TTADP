import { VALIDATION_ALERT_SEVERITY } from '../../constants';
import type { ValidationAlertSummary } from './runValidation';

export type GateHaltMode = 'none' | 'all' | 'list';

export interface GateHaltDecision {
  // every critical check_name in the run (independent of the halt policy)
  criticalChecks: string[];
  // the subset the policy says should actually stop the fact-table refresh
  haltingChecks: string[];
  shouldHalt: boolean;
  mode: GateHaltMode;
}

/**
 * Decide whether a gate run's critical alerts should actually halt the
 * fact-table refresh, based on the `MONITORING_GATE_HALT_CHECKS` env var. This is
 * THE switch that turns the monitoring gate from report-only into enforcing; the
 * full explanation lives in docs/monitoring-data-validation.md ("Enforcement
 * controls"). Whatever it decides, criticals are always recorded and logged - the
 * env var only controls the CLI's exit code.
 *
 * - unset / empty / 'none'  -> report-only (safe default): nothing halts.
 * - 'all' (alone or anywhere in the list) -> halt on any critical.
 * - comma-separated check_names -> halt only on those checks (enable one at a
 *   time). Matched case-insensitively, tolerant of surrounding whitespace.
 *
 * The decision is kept here in a caller-side policy, not in the runner or the
 * checks: the runner only reports, and the same checks feed both the report-only
 * observation and the enforced gate.
 */
export const resolveGateHalt = (
  alerts: ValidationAlertSummary[],
  rawEnv: string | undefined
): GateHaltDecision => {
  const criticalChecks = alerts
    .filter((alert) => alert.severity === VALIDATION_ALERT_SEVERITY.CRITICAL)
    .map((alert) => alert.check_name);

  const haltAll = (mode: GateHaltMode): GateHaltDecision => ({
    criticalChecks,
    haltingChecks: [...criticalChecks],
    shouldHalt: criticalChecks.length > 0,
    mode,
  });

  const value = (rawEnv || '').trim().toLowerCase();

  if (!value || value === 'none') {
    return { criticalChecks, haltingChecks: [], shouldHalt: false, mode: 'none' };
  }

  const enabled = new Set(
    value
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  );

  // 'all' anywhere in the list wins - halt on every critical.
  if (enabled.has('all')) {
    return haltAll('all');
  }

  const haltingChecks = criticalChecks.filter((name) => enabled.has(name.toLowerCase()));
  return { criticalChecks, haltingChecks, shouldHalt: haltingChecks.length > 0, mode: 'list' };
};

export default resolveGateHalt;
