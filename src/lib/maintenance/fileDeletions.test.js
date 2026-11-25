const { CronJob } = require('cron');
const { MAINTENANCE_CATEGORY } = require('../../constants');
const { auditLogger } = require('../../logger');
const { requeuePendingFileDeletions } = require('../../services/files');
const { registerCronEnrollmentFunction, addCronJob } = require('./common');
const { REQUEUE_FILE_DELETIONS, runRequeuePendingFileDeletions } = require('./fileDeletions');

jest.mock('cron', () => ({ CronJob: jest.fn() }));
jest.mock('../../logger', () => ({
  auditLogger: { log: jest.fn(), info: jest.fn(), error: jest.fn() },
}));
jest.mock('../../services/files', () => ({
  requeuePendingFileDeletions: jest.fn(),
}));
jest.mock('./common', () => ({
  registerCronEnrollmentFunction: jest.fn(),
  addCronJob: jest.fn(),
}));

describe('file deletion maintenance cron', () => {
  // Captured at module load, before any test clears the mocks.
  const enroll = registerCronEnrollmentFunction.mock.calls[0][0];
  const originalForceCron = process.env.FORCE_CRON;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FORCE_CRON;
  });

  afterAll(() => {
    process.env.FORCE_CRON = originalForceCron;
  });

  it('enrolls an hourly job on instance 0, context 1, in production', async () => {
    await enroll('0', 1, 'production');

    expect(addCronJob).toHaveBeenCalledWith(
      MAINTENANCE_CATEGORY.MAINTENANCE,
      REQUEUE_FILE_DELETIONS,
      expect.any(Function),
      '15 * * * *'
    );

    const [, , createJob, schedule] = addCronJob.mock.calls[0];
    createJob(MAINTENANCE_CATEGORY.MAINTENANCE, REQUEUE_FILE_DELETIONS, 'UTC', schedule);
    expect(CronJob).toHaveBeenCalledWith(
      schedule,
      runRequeuePendingFileDeletions,
      null,
      true,
      'UTC'
    );
  });

  it.each([
    ['another instance', '1', 1, 'production'],
    ['another context', '0', 2, 'production'],
    ['a non-production environment', '0', 1, 'development'],
  ])('skips enrollment on %s', async (_label, instanceId, contextId, env) => {
    await enroll(instanceId, contextId, env);
    expect(addCronJob).not.toHaveBeenCalled();
  });

  it('enrolls anywhere when FORCE_CRON is set', async () => {
    process.env.FORCE_CRON = 'true';
    await enroll('3', 2, 'development');
    expect(addCronJob).toHaveBeenCalled();
  });

  it('logs the sweep result', async () => {
    requeuePendingFileDeletions.mockResolvedValueOnce({ requeued: 2, exhausted: 1 });
    await runRequeuePendingFileDeletions();
    expect(auditLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('requeued 2 pending S3 file deletions (1 out of attempts)')
    );
  });

  it('logs instead of throwing when the sweep fails', async () => {
    requeuePendingFileDeletions.mockRejectedValueOnce(new Error('db down'));
    await expect(runRequeuePendingFileDeletions()).resolves.toBeUndefined();
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('db down'));
  });
});
