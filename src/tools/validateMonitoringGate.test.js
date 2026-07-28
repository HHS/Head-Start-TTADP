import { VALIDATION_PROCESS, VALIDATION_RUN_STATUS } from '../constants';
import { sequelize, ValidationAlert, ValidationRun } from '../models';
import validateMonitoringGate from './validateMonitoringGate';

describe('validateMonitoringGate', () => {
  afterAll(async () => {
    const runIds = (
      await ValidationRun.findAll({
        where: { process_name: VALIDATION_PROCESS.MONITORING_GATE },
        attributes: ['id'],
        raw: true,
      })
    ).map((r) => r.id);
    await ValidationAlert.destroy({ where: { run_id: runIds }, force: true });
    await ValidationRun.destroy({ where: { id: runIds }, force: true });
    await sequelize.close();
  });

  // The two gate checks aggregate over the whole findings table and every
  // open-AR citation, so their firing is not deterministically unit-testable
  // against the shared database. This exercises the check SQL end-to-end against
  // the real schema (catching column/join/function regressions - an INSERT..SELECT
  // is fully planned even when it selects zero rows) plus the runner wiring. The
  // critical -> verdict counting that actually gates the import is covered
  // deterministically in validation/runValidation.test.js.
  it('runs the gate checks and records a successful monitoring_gate run with a verdict', async () => {
    const result = await validateMonitoringGate();

    expect(typeof result.criticalCount).toBe('number');
    expect(result.criticalCount).toBeGreaterThanOrEqual(0);
    expect(typeof result.alertCount).toBe('number');

    const run = await ValidationRun.findByPk(result.runId);
    expect(run.process_name).toBe(VALIDATION_PROCESS.MONITORING_GATE);
    expect(run.status).toBe(VALIDATION_RUN_STATUS.SUCCESS);
    expect(run.completed_at).not.toBeNull();
  });
});
