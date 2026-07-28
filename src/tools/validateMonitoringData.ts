import { VALIDATION_PROCESS } from '../constants';
import refreshMonitoringAlerts from './validation/monitoringAlerts';
import refreshMonitoringObservations from './validation/monitoringObservations';
import updateMonitoringTimeSeries from './validation/monitoringTimeSeries';
import runValidation from './validation/runValidation';

/**
 * Daily observational validation of imported ITAMS Monitoring data. Runs the
 * three validation steps (each in its own module under ./validation) through
 * the shared runner:
 *
 * 1. updateMonitoringTimeSeries - upserts time-series aggregated statistics into
 *    ValidationTimeSeries.
 * 2. refreshMonitoringObservations - rebuilds per-entity observations in
 *    ValidationRecords.
 * 3. refreshMonitoringAlerts - rebuilds ValidationAlerts from threshold checks
 *    over the time series and validity checks over the observations.
 *
 * This process is observational and runs after update_fact_tables: it records a
 * run, alerts to Slack, and feeds future statistical modeling, but never gates
 * the import. Outage-level prevention lives in the pre-refresh gate
 * (src/tools/validateMonitoringGate.ts).
 */
const validateMonitoringData = async (): Promise<void> => {
  await runValidation({
    processName: VALIDATION_PROCESS.MONITORING,
    logLabel: 'Monitoring Validation Alerts',
    steps: [updateMonitoringTimeSeries, refreshMonitoringObservations, refreshMonitoringAlerts],
  });
};

export default validateMonitoringData;
