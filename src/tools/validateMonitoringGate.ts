import { VALIDATION_PROCESS } from '../constants';
import monitoringGateChecks from './validation/monitoringGateChecks';
import { getMonitoringImportCycle } from './validation/monitoringImportCycle';
import type { RunValidationResult } from './validation/runValidation';
import runValidation from './validation/runValidation';

/**
 * Pre-refresh critical gate for imported ITAMS Monitoring data. Runs cheap
 * global sanity checks over the raw Monitoring* tables and the wider Hub
 * (ActivityReportObjectiveCitations) BEFORE update_fact_tables, so an
 * outage-level data problem (e.g. mass erroneous source-deletion of findings)
 * can block the refresh instead of propagating into the fact tables and goals.
 *
 * Returns the runner verdict; the CLI (validateMonitoringGateCLI.ts) exits
 * nonzero when criticalCount > 0, which stops the CI import phase loop before
 * update_fact_tables runs. This is the "prevent" path; a future in-refresh gate
 * would instead throw inside updateMonitoringFactTables' transaction to roll
 * back a bad swap.
 */
const validateMonitoringGate = async (): Promise<RunValidationResult> => {
  const cycle = await getMonitoringImportCycle();
  return runValidation({
    processName: VALIDATION_PROCESS.MONITORING_GATE,
    logLabel: 'Monitoring Gate',
    steps: [monitoringGateChecks],
    cycle,
  });
};

export default validateMonitoringGate;
