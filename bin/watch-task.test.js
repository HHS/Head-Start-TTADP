const { parseTaskStatus, watchTask, logTaskErrors } = require('./watch-task');

describe('watch-task', () => {
  it('parses exact task names from cf tasks output', () => {
    const output = `
id   name                         state       memory   disk
1    import-download-prod-1       RUNNING     2G       2G
2    import-download-prod-12      FAILED      2G       2G
`;

    expect(parseTaskStatus(output, 'import-download-prod-1')).toBe('RUNNING');
  });

  it('throws when the task is missing', () => {
    expect(() => parseTaskStatus('id name state\n', 'missing-task')).toThrow(
      'Task missing-task not found'
    );
  });

  it('waits through pending and running until success', () => {
    const runCmd = jest
      .fn()
      .mockReturnValueOnce(`
id   name          state
1    import-task   PENDING
`)
      .mockReturnValueOnce('')
      .mockReturnValueOnce(`
id   name          state
1    import-task   RUNNING
`)
      .mockReturnValueOnce('')
      .mockReturnValueOnce(`
id   name          state
1    import-task   SUCCEEDED
`);

    expect(watchTask('tta-smarthub-prod', 'import-task', runCmd)).toBe('SUCCEEDED');
    expect(runCmd).toHaveBeenCalledWith('sleep 10', false);
  });

  it('retries until the task appears in cf tasks output', () => {
    const runCmd = jest
      .fn()
      .mockReturnValueOnce(`
id   name          state
`)
      .mockReturnValueOnce('')
      .mockReturnValueOnce(`
id   name          state
1    import-task   RUNNING
`)
      .mockReturnValueOnce('')
      .mockReturnValueOnce(`
id   name          state
1    import-task   SUCCEEDED
`);

    expect(watchTask('tta-smarthub-prod', 'import-task', runCmd)).toBe('SUCCEEDED');
    expect(runCmd).toHaveBeenCalledWith('sleep 10', false);
  });

  it('returns failed for terminal failed state', () => {
    const runCmd = jest.fn().mockReturnValueOnce(`
id   name          state
1    import-task   FAILED
`);

    expect(watchTask('tta-smarthub-prod', 'import-task', runCmd)).toBe('FAILED');
  });

  it('throws on unexpected states', () => {
    const runCmd = jest.fn().mockReturnValueOnce(`
id   name          state
1    import-task   DOWN
`);

    expect(() => watchTask('tta-smarthub-prod', 'import-task', runCmd)).toThrow(
      'Unexpected task status: DOWN'
    );
  });

  it('does not throw if fetching error logs fails', () => {
    const runCmd = jest.fn(() => {
      throw new Error('grep exited 1');
    });

    expect(() => logTaskErrors('tta-smarthub-prod', 'import-task', runCmd)).not.toThrow();
  });
});
