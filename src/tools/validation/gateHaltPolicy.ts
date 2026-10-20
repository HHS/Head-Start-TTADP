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
 * Uses the MONITORING_GATE_HALT_CHECKS value (passed in by the CLI as `rawEnv`) to
 * decide whether criticals halt fact table refreshes via the CLI's exit code. Kept
 * out of the CLI so this parsing is unit-testable, since the CLI runs and exits on
 * import. See docs/monitoring-data-validation.md ("Enforcement controls").
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
