import { VALIDATION_PROCESS } from '../constants';
import refreshMonitoringAlerts from './validation/monitoringAlerts';
import refreshMonitoringFactTableAlerts from './validation/monitoringFactTableAlerts';
import refreshMonitoringFactTableObservations from './validation/monitoringFactTableObservations';
import { getMonitoringImportCycle } from './validation/monitoringImportCycle';
import refreshMonitoringObservations from './validation/monitoringObservations';
import updateMonitoringTimeSeries from './validation/monitoringTimeSeries';
import refreshMonitoringValidationStaging from './validation/monitoringValidationStaging';
import runValidation from './validation/runValidation';

/**
 * Daily observational validation of imported ITAMS Monitoring data. Runs the
 * validation steps (each in its own module under ./validation) through the
 * shared runner:
 *
 * This whole process runs read-only, after updateMonitoringFactTables.ts has
 * already completed (this file never calls or triggers it - it only reads the
 * raw IT-AMS tables and the fact tables that a separate, already-finished run
 * of that script wrote). Steps:
 *
 * 1. refreshMonitoringValidationStaging - builds shared temp tables (e.g. the
 *    validation date window) that later steps read instead of each re-deriving
 *    it. Runs first so everything after it can rely on what it produces.
 * 2. refreshMonitoringObservations - rebuilds per-entity observations in
 *    ValidationRecords by reading the raw IT-AMS tables.
 * 3. refreshMonitoringFactTableObservations - the same, but reading the fact
 *    tables updateMonitoringFactTables.ts already produced (Citations,
 *    DeliveredReviews, ...) instead of raw IT-AMS data.
 * 4. updateMonitoringTimeSeries - upserts time-series aggregated statistics into
 *    ValidationTimeSeries.
 * 5. refreshMonitoringAlerts - rebuilds ValidationAlerts from threshold checks
 *    over the time series and validity checks over the raw-data observations.
 * 6. refreshMonitoringFactTableAlerts - the same, for the fact-table observations.
 *
 * It records a run, alerts to Slack, and feeds future statistical modeling, but
 * never gates the import. Outage-level prevention lives in the pre-refresh gate
 * (src/tools/validateMonitoringGate.ts).
 */
const validateMonitoringData = async (): Promise<void> => {
  const cycle = await getMonitoringImportCycle();
  await runValidation({
    processName: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
    logLabel: 'Monitoring Validation Alerts',
    steps: [
      refreshMonitoringValidationStaging,
      refreshMonitoringObservations,
      refreshMonitoringFactTableObservations,
      updateMonitoringTimeSeries,
      refreshMonitoringAlerts,
      refreshMonitoringFactTableAlerts,
    ],
    cycle,
  });
};

export default validateMonitoringData;
