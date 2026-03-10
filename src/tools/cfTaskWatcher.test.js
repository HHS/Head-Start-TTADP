const {
  checkStatus,
  watchTask,
} = require('./cfTaskWatcher');

describe('cfTaskWatcher', () => {
  it('parses task status from cf tasks output', () => {
    const run = jest.fn().mockReturnValue('run_import_job-prod-123  0  SUCCEEDED  command');

    expect(checkStatus('app-name', 'run_import_job-prod-123', run)).toBe('SUCCEEDED');
  });

  it('returns zero when the task succeeds', () => {
    const run = jest
      .fn()
      .mockReturnValueOnce('run_import_job-prod-123  0  RUNNING  command')
      .mockReturnValueOnce('sleep complete')
      .mockReturnValueOnce('run_import_job-prod-123  0  SUCCEEDED  command');

    expect(watchTask('app-name', 'run_import_job-prod-123', run)).toBe(0);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('returns one and fetches logs when the task fails', () => {
    const run = jest
      .fn()
      .mockReturnValueOnce('run_import_job-prod-123  0  FAILED  command')
      .mockReturnValueOnce('slept')
      .mockReturnValueOnce('error line');

    expect(watchTask('app-name', 'run_import_job-prod-123', run)).toBe(1);
    expect(run).toHaveBeenNthCalledWith(2, 'sleep 15');
    expect(run).toHaveBeenNthCalledWith(
      3,
      'cf logs app-name --recent | grep run_import_job-prod-123 | grep -i "error\\|failed"',
    );
  });
});
