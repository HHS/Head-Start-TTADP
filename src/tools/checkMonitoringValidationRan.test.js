import { Op } from 'sequelize';
import { VALIDATION_PROCESS, VALIDATION_RUN_STATUS } from '../constants';
import { sequelize, ValidationRun } from '../models';
import checkMonitoringValidationRan from './checkMonitoringValidationRan';

jest.mock('../logger');

describe('checkMonitoringValidationRan', () => {
  const createdRunIds = [];

  const createRun = async (status, startedAt) => {
    const run = await ValidationRun.create({
      process_name: VALIDATION_PROCESS.MONITORING,
      status,
      started_at: startedAt,
      completed_at: status === VALIDATION_RUN_STATUS.STARTED ? null : startedAt,
      alert_count: status === VALIDATION_RUN_STATUS.SUCCESS ? 2 : null,
    });
    createdRunIds.push(run.id);
    return run;
  };

  beforeAll(async () => {
    // Age any recent monitoring runs (e.g. left by other test files against the
    // shared database) out of the 24-hour window so results are deterministic.
    await ValidationRun.update(
      { started_at: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      {
        where: {
          process_name: VALIDATION_PROCESS.MONITORING,
          started_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }
    );
  });

  afterAll(async () => {
    await ValidationRun.destroy({ where: { id: createdRunIds }, force: true });
    await sequelize.close();
  });

  it('reports no run when nothing started in the last 24 hours', async () => {
    const result = await checkMonitoringValidationRan();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no validation run in last 24 hours');
  });

  it('reports ok for a recent successful run', async () => {
    const run = await createRun(VALIDATION_RUN_STATUS.SUCCESS, new Date());
    const result = await checkMonitoringValidationRan();
    expect(result.ok).toBe(true);
    expect(`${result.runId}`).toBe(`${run.id}`);
    expect(result.alertCount).toBe(2);
    expect(result.asOf).toEqual(expect.stringMatching(/E[SD]T$/));
  });

  it('reports a failed run when the latest run failed', async () => {
    await createRun(VALIDATION_RUN_STATUS.FAILURE, new Date());
    const result = await checkMonitoringValidationRan();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('run failed');
  });

  it('reports an incomplete run when the latest run is still started', async () => {
    await createRun(VALIDATION_RUN_STATUS.STARTED, new Date());
    const result = await checkMonitoringValidationRan();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('run incomplete');
  });
});
