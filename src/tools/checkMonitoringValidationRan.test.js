import { VALIDATION_PROCESS, VALIDATION_RUN_STATUS } from '../constants';
import { sequelize, ValidationRun } from '../models';
import checkMonitoringValidationRan from './checkMonitoringValidationRan';
import getMonitoringImportCycle from './validation/monitoringImportCycle';

jest.mock('../logger');
jest.mock('./validation/monitoringImportCycle');

describe('checkMonitoringValidationRan', () => {
  const createdRunIds = [];
  // Distinctive ids so runs left by other test files against the shared DB
  // can't match the cycle under test.
  const CURRENT_IMPORT_ID = 987654321;
  const PRIOR_IMPORT_ID = 987654320;

  const createRun = async (status, importId, startedAt = new Date()) => {
    const run = await ValidationRun.create({
      process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
      status,
      started_at: startedAt,
      completed_at: status === VALIDATION_RUN_STATUS.STARTED ? null : startedAt,
      alert_count: status === VALIDATION_RUN_STATUS.SUCCESS ? 2 : null,
      import_id: importId,
      source_updated_at: startedAt,
    });
    createdRunIds.push(run.id);
    return run;
  };

  beforeEach(() => {
    getMonitoringImportCycle.mockResolvedValue({
      import_id: CURRENT_IMPORT_ID,
      source_updated_at: new Date(),
    });
  });

  afterAll(async () => {
    await ValidationRun.destroy({ where: { id: createdRunIds }, force: true });
    await sequelize.close();
  });

  it('reports ok when there is no processed import to validate', async () => {
    getMonitoringImportCycle.mockResolvedValue({ import_id: null, source_updated_at: null });
    const result = await checkMonitoringValidationRan();
    expect(result.ok).toBe(true);
    expect(result.reason).toBe('no processed monitoring import to validate');
  });

  it('reports no run when nothing ran for the current import cycle', async () => {
    const result = await checkMonitoringValidationRan();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no validation run for the current import cycle');
  });

  it('does not accept a run from a previous import cycle', async () => {
    await createRun(VALIDATION_RUN_STATUS.SUCCESS, PRIOR_IMPORT_ID);
    const result = await checkMonitoringValidationRan();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no validation run for the current import cycle');
  });

  it('reports ok for a successful run of the current cycle', async () => {
    const run = await createRun(VALIDATION_RUN_STATUS.SUCCESS, CURRENT_IMPORT_ID);
    const result = await checkMonitoringValidationRan();
    expect(result.ok).toBe(true);
    expect(`${result.runId}`).toBe(`${run.id}`);
    expect(result.alertCount).toBe(2);
    expect(result.asOf).toEqual(expect.stringMatching(/E[SD]T$/));
  });

  it('reports a failed run when the latest run for the cycle failed', async () => {
    await createRun(VALIDATION_RUN_STATUS.FAILURE, CURRENT_IMPORT_ID);
    const result = await checkMonitoringValidationRan();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('run failed');
  });

  it('reports an incomplete run when the latest run for the cycle is still started', async () => {
    await createRun(VALIDATION_RUN_STATUS.STARTED, CURRENT_IMPORT_ID);
    const result = await checkMonitoringValidationRan();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('run incomplete');
  });
});
