import { VALIDATION_PROCESS } from '../constants';
import refreshMonitoringAlerts from './validation/monitoringAlerts';
import { getMonitoringImportCycle } from './validation/monitoringImportCycle';
import refreshMonitoringObservations from './validation/monitoringObservations';
import updateMonitoringTimeSeries from './validation/monitoringTimeSeries';
import runValidation from './validation/runValidation';

/**
 * Daily observational validation of imported ITAMS Monitoring data. Runs the
 * three validation steps (each in its own module under ./validation) through
 * the shared runner:
 *
 * 1. refreshMonitoringObservations - rebuilds per-entity observations in
 *    ValidationRecords. Runs first so later steps can build on the observations.
 * 2. updateMonitoringTimeSeries - upserts time-series aggregated statistics into
 *    ValidationTimeSeries.
 * 3. refreshMonitoringAlerts - rebuilds ValidationAlerts from threshold checks
 *    over the time series and validity checks over the observations.
 *
 * This process is observational and runs after update_fact_tables: it records a
 * run, alerts to Slack, and feeds future statistical modeling, but never gates
 * the import. Outage-level prevention lives in the pre-refresh gate
 * (src/tools/validateMonitoringGate.ts).
 */
const validateMonitoringData = async (): Promise<void> => {
  const cycle = await getMonitoringImportCycle();
  await runValidation({
    processName: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
    logLabel: 'Monitoring Validation Alerts',
    steps: [refreshMonitoringObservations, updateMonitoringTimeSeries, refreshMonitoringAlerts],
    cycle,
  });
};

export default validateMonitoringData;
