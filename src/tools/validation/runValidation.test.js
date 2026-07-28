import { VALIDATION_ALERT_SEVERITY, VALIDATION_RUN_STATUS } from '../../constants';
import { sequelize, ValidationAlert, ValidationRun } from '../../models';
import runValidation from './runValidation';

// A synthetic process name so cleanup never touches real validation runs.
const PROCESS = 'test_run_validation';

// A step that inserts one critical and one non-critical alert for the current
// run (read from the validation_run temp table the runner sets up).
const insertAlertsStep = async (transaction) => {
  await sequelize.query(
    `
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, "createdAt", "updatedAt")
    SELECT run_id, 'test_critical', 'a critical thing', :critical, NOW(), NOW() FROM validation_run
    UNION ALL
    SELECT run_id, 'test_alert', 'a normal thing', :alert, NOW(), NOW() FROM validation_run
    ;
    `,
    {
      raw: true,
      transaction,
      replacements: {
        critical: VALIDATION_ALERT_SEVERITY.CRITICAL,
        alert: VALIDATION_ALERT_SEVERITY.ALERT,
      },
    }
  );
};

describe('runValidation', () => {
  afterEach(async () => {
    const runIds = (
      await ValidationRun.findAll({
        where: { process_name: PROCESS },
        attributes: ['id'],
        raw: true,
      })
    ).map((r) => r.id);
    if (runIds.length) {
      await ValidationAlert.destroy({ where: { run_id: runIds }, force: true });
      await ValidationRun.destroy({ where: { id: runIds }, force: true });
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('runs steps, records the run, and returns a verdict counting critical alerts', async () => {
    const result = await runValidation({
      processName: PROCESS,
      logLabel: 'Test Validation',
      steps: [insertAlertsStep],
    });

    expect(result.alertCount).toBe(2);
    expect(result.criticalCount).toBe(1);
    // severity DESC orders 'critical' before 'alert' in the summary
    expect(result.alerts[0].severity).toBe(VALIDATION_ALERT_SEVERITY.CRITICAL);
    expect(result.alerts.map((a) => a.check_name).sort()).toEqual(['test_alert', 'test_critical']);

    const run = await ValidationRun.findByPk(result.runId);
    expect(run.status).toBe(VALIDATION_RUN_STATUS.SUCCESS);
    expect(run.alert_count).toBe(2);
    expect(run.completed_at).not.toBeNull();
  });

  it('rolls numeric step return values up into stats_upserted', async () => {
    const result = await runValidation({
      processName: PROCESS,
      logLabel: 'Test Validation',
      steps: [async () => 3, async () => 4, async () => {}],
    });

    expect(result.statsUpserted).toBe(7);
    const run = await ValidationRun.findByPk(result.runId);
    expect(run.stats_upserted).toBe(7);
  });

  it('marks the run FAILURE and rethrows when a step throws', async () => {
    await expect(
      runValidation({
        processName: PROCESS,
        logLabel: 'Test Validation',
        steps: [
          async () => {
            throw new Error('step exploded');
          },
        ],
      })
    ).rejects.toThrow('step exploded');

    const run = await ValidationRun.findOne({
      where: { process_name: PROCESS },
      order: [['id', 'DESC']],
    });
    expect(run.status).toBe(VALIDATION_RUN_STATUS.FAILURE);
    expect(run.error).toContain('step exploded');
  });
});
