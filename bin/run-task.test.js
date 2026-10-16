const { EventEmitter } = require('events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

jest.mock('node:child_process', () => ({
  execFileSync: jest.fn(),
  spawn: jest.fn(),
}));

const childProcess = require('node:child_process');
const {
  DEFAULT_TIMEOUT_SECONDS,
  LOG_FLUSH_WAIT_MS,
  LOG_STREAM_RESTART_DELAY_MS,
  MAX_LOG_STREAM_RESTARTS,
  appendTaskRunStatus,
  buildTaskRunRecord,
  filterLogChunk,
  parseCliArgs,
  readStatusFile,
  runTask,
  startLogStream,
  waitForTask,
} = require('./run-task');

function createSpawnedProcess() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = jest.fn(() => {
    child.killed = true;
    child.emit('exit', 0, null);
  });
  child.killed = false;
  return child;
}

describe('run-task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a generated task name when missing', () => {
    const parsed = parseCliArgs(['tta-smarthub-prod', '--command', 'yarn db:migrate:prod']);

    expect(parsed.appName).toBe('tta-smarthub-prod');
    expect(parsed.cfArgs).toEqual(['--command', 'yarn db:migrate:prod', '--name', parsed.taskName]);
    expect(parsed.taskName).toMatch(/^tta-smarthub-prod-task-/);
    expect(parsed.timeoutSeconds).toBe(DEFAULT_TIMEOUT_SECONDS);
  });

  it('preserves a provided task name and timeout flag', () => {
    const parsed = parseCliArgs([
      'tta-smarthub-prod',
      '--status-file',
      '/tmp/task-status.json',
      '--log-file',
      '/tmp/task.log',
      '--command',
      'yarn db:migrate:prod',
      '--name',
      'migrate-prod',
      '--timeout',
      '45',
    ]);

    expect(parsed.taskName).toBe('migrate-prod');
    expect(parsed.timeoutSeconds).toBe(45);
    expect(parsed.statusFile).toBe('/tmp/task-status.json');
    expect(parsed.logFile).toBe('/tmp/task.log');
    expect(parsed.command).toBe('yarn db:migrate:prod');
    expect(parsed.cfArgs).toEqual(['--command', 'yarn db:migrate:prod', '--name', 'migrate-prod']);
  });

  it('waits through running states until success', async () => {
    const runCfCommandImpl = jest
      .fn()
      .mockReturnValueOnce(`
id   name          state
1    import-task   PENDING
`)
      .mockReturnValueOnce(`
id   name          state
1    import-task   RUNNING
`)
      .mockReturnValueOnce(`
id   name          state
1    import-task   SUCCEEDED
`);
    const sleepImpl = jest.fn().mockResolvedValue();
    const onStatus = jest.fn();

    await expect(
      waitForTask('tta-smarthub-prod', 'import-task', {
        runCfCommandImpl,
        sleepImpl,
        pollIntervalMs: 1,
        timeoutSeconds: 5,
        onStatus,
      })
    ).resolves.toBe('SUCCEEDED');

    expect(onStatus).toHaveBeenNthCalledWith(1, 'PENDING');
    expect(onStatus).toHaveBeenNthCalledWith(2, 'RUNNING');
    expect(onStatus).toHaveBeenNthCalledWith(3, 'SUCCEEDED');
    expect(sleepImpl).toHaveBeenCalledTimes(2);
  });

  it('retries until the task appears in cf tasks output', async () => {
    const runCfCommandImpl = jest
      .fn()
      .mockReturnValueOnce(`
id   name          state
`)
      .mockReturnValueOnce(`
id   name          state
1    import-task   RUNNING
`)
      .mockReturnValueOnce(`
id   name          state
1    import-task   SUCCEEDED
`);
    const sleepImpl = jest.fn().mockResolvedValue();
    const onStatus = jest.fn();

    await expect(
      waitForTask('tta-smarthub-prod', 'import-task', {
        runCfCommandImpl,
        sleepImpl,
        pollIntervalMs: 1,
        timeoutSeconds: 5,
        onStatus,
      })
    ).resolves.toBe('SUCCEEDED');

    expect(onStatus).toHaveBeenNthCalledWith(1, 'RUNNING');
    expect(onStatus).toHaveBeenNthCalledWith(2, 'SUCCEEDED');
    expect(sleepImpl).toHaveBeenCalledTimes(2);
  });

  it('times out when the task never reaches a terminal state', async () => {
    const runCfCommandImpl = jest.fn().mockReturnValue(`
id   name          state
1    import-task   RUNNING
`);
    const sleepImpl = jest.fn(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 2);
      });
    });

    await expect(
      waitForTask('tta-smarthub-prod', 'import-task', {
        runCfCommandImpl,
        sleepImpl,
        pollIntervalMs: 1,
        timeoutSeconds: 0.001,
      })
    ).rejects.toThrow('Timed out waiting for task import-task');
  });

  it('returns zero when launch and task both succeed', async () => {
    const stop = jest.fn().mockResolvedValue();
    const result = await runTask(
      {
        appName: 'tta-smarthub-prod',
        cfArgs: ['--command', 'yarn db:migrate:prod', '--name', 'migrate-prod'],
        command: 'yarn db:migrate:prod',
        taskName: 'migrate-prod',
        timeoutSeconds: 30,
      },
      {
        logFlushWaitMs: 0,
        runCfCommandImpl: jest.fn(),
        startLogStreamImpl: jest.fn(() => ({ stop })),
        waitForTaskImpl: jest.fn().mockResolvedValue('SUCCEEDED'),
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.status).toBe('SUCCEEDED');
    expect(stop).toHaveBeenCalled();
  });

  it('waits for task logs to flush before returning success', async () => {
    const stop = jest.fn().mockResolvedValue();
    const sleepImpl = jest.fn().mockResolvedValue();

    const result = await runTask(
      {
        appName: 'tta-smarthub-prod',
        cfArgs: ['--command', 'yarn db:migrate:prod', '--name', 'migrate-prod'],
        command: 'yarn db:migrate:prod',
        taskName: 'migrate-prod',
        timeoutSeconds: 30,
      },
      {
        runCfCommandImpl: jest.fn(),
        sleepImpl,
        startLogStreamImpl: jest.fn(() => ({ stop })),
        waitForTaskImpl: jest.fn().mockResolvedValue('SUCCEEDED'),
      }
    );

    expect(result.exitCode).toBe(0);
    expect(sleepImpl).toHaveBeenCalledWith(LOG_FLUSH_WAIT_MS);
    expect(stop).toHaveBeenCalled();
  });

  it('returns non-zero when the task fails after a successful launch', async () => {
    const stop = jest.fn().mockResolvedValue();
    const result = await runTask(
      {
        appName: 'tta-smarthub-prod',
        cfArgs: ['--command', 'yarn db:migrate:prod', '--name', 'migrate-prod'],
        command: 'yarn db:migrate:prod',
        taskName: 'migrate-prod',
        timeoutSeconds: 30,
      },
      {
        logFlushWaitMs: 0,
        runCfCommandImpl: jest.fn(),
        startLogStreamImpl: jest.fn(() => ({ stop })),
        waitForTaskImpl: jest.fn().mockResolvedValue('FAILED'),
      }
    );

    expect(result.exitCode).toBe(1);
    expect(result.status).toBe('FAILED');
    expect(stop).toHaveBeenCalled();
  });

  it('returns the cf command exit code when launch fails', async () => {
    const error = new Error('launch failed');
    error.status = 17;
    const result = await runTask(
      {
        appName: 'tta-smarthub-prod',
        cfArgs: ['--command', 'yarn db:migrate:prod', '--name', 'migrate-prod'],
        command: 'yarn db:migrate:prod',
        taskName: 'migrate-prod',
        timeoutSeconds: 30,
      },
      {
        logFlushWaitMs: 0,
        runCfCommandImpl: jest.fn(() => {
          throw error;
        }),
        startLogStreamImpl: jest.fn(),
        waitForTaskImpl: jest.fn(),
      }
    );

    expect(result.exitCode).toBe(17);
    expect(result.status).toBe('FAILED_TO_START');
  });

  it('filters only task-specific log lines', () => {
    const lines = [];

    filterLogChunk(
      [
        '2026-03-24T10:00:00Z [APP/TASK/import-task/0] OUT first line',
        '2026-03-24T10:00:01Z [APP/PROC/WEB/0] OUT unrelated',
        '2026-03-24T10:00:02Z [APP/TASK/import-task/0] ERR second line',
      ].join('\n'),
      'import-task',
      (line) => lines.push(line)
    );

    expect(lines).toEqual([
      '2026-03-24T10:00:00Z [APP/TASK/import-task/0] OUT first line\n',
      '2026-03-24T10:00:02Z [APP/TASK/import-task/0] ERR second line\n',
    ]);
  });

  it('starts cf logs and stops it cleanly', async () => {
    const child = createSpawnedProcess();
    childProcess.spawn.mockReturnValue(child);
    const stdout = jest.fn();
    const stderr = jest.fn();

    const stream = startLogStream('tta-smarthub-prod', 'import-task', stdout, stderr);
    child.stdout.emit('data', Buffer.from('skip\nkeep import-task\n'));
    child.stderr.emit('data', Buffer.from('err import-task\n'));

    await stream.stop();

    expect(stdout).toHaveBeenCalledWith('keep import-task\n');
    expect(stderr).toHaveBeenCalledWith('err import-task\n');
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  describe('when cf logs exits unexpectedly', () => {
    const config = {
      appName: 'tta-smarthub-prod',
      cfArgs: ['--command', 'yarn cli:import-system process 1', '--name', 'import-process-prod'],
      command: 'yarn cli:import-system process 1',
      taskName: 'import-process-prod',
      timeoutSeconds: 30,
    };
    const droppedStream = () => ({
      stop: jest.fn().mockResolvedValue(),
      completion: Promise.resolve({ code: 1, signal: null, expected: false }),
    });
    const healthyStream = () => ({
      stop: jest.fn().mockResolvedValue(),
      completion: new Promise(() => {}),
    });
    // Resolves after every pending restart (promise callbacks) has run.
    const afterRestarts = (status) => () =>
      new Promise((resolve) => {
        setImmediate(() => resolve(status));
      });

    beforeEach(() => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      console.warn.mockRestore();
      console.error.mockRestore();
    });

    it('restarts the log stream and succeeds when the task succeeds', async () => {
      const first = droppedStream();
      const second = healthyStream();
      const startLogStreamImpl = jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
      const sleepImpl = jest.fn().mockResolvedValue();

      const result = await runTask(config, {
        logFlushWaitMs: 0,
        runCfCommandImpl: jest.fn(),
        sleepImpl,
        startLogStreamImpl,
        waitForTaskImpl: jest.fn(afterRestarts('SUCCEEDED')),
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe('SUCCEEDED');
      expect(startLogStreamImpl).toHaveBeenCalledTimes(2);
      expect(sleepImpl).toHaveBeenCalledWith(LOG_STREAM_RESTART_DELAY_MS);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'cf logs exited unexpectedly while waiting for task import-process-prod; restarting (attempt 1/'
        )
      );
      expect(second.stop).toHaveBeenCalled();
    });

    it('still fails when the task fails', async () => {
      const result = await runTask(config, {
        logFlushWaitMs: 0,
        runCfCommandImpl: jest.fn(),
        sleepImpl: jest.fn().mockResolvedValue(),
        startLogStreamImpl: jest
          .fn()
          .mockReturnValueOnce(droppedStream())
          .mockReturnValueOnce(healthyStream()),
        waitForTaskImpl: jest.fn(afterRestarts('FAILED')),
      });

      expect(result.exitCode).toBe(1);
      expect(result.status).toBe('FAILED');
    });

    it('stops restarting after the retry limit and keeps polling', async () => {
      const startLogStreamImpl = jest.fn(droppedStream);

      const result = await runTask(config, {
        logFlushWaitMs: 0,
        runCfCommandImpl: jest.fn(),
        sleepImpl: jest.fn().mockResolvedValue(),
        startLogStreamImpl,
        waitForTaskImpl: jest.fn(afterRestarts('SUCCEEDED')),
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe('SUCCEEDED');
      expect(startLogStreamImpl).toHaveBeenCalledTimes(MAX_LOG_STREAM_RESTARTS + 1);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(`giving up after ${MAX_LOG_STREAM_RESTARTS} restarts`)
      );
    });

    it('treats a log stream that fails to spawn the same as one that exits', async () => {
      const startLogStreamImpl = jest
        .fn()
        .mockReturnValueOnce({
          stop: jest.fn().mockResolvedValue(),
          completion: Promise.reject(new Error('spawn cf ENOENT')),
        })
        .mockReturnValueOnce(healthyStream());

      const result = await runTask(config, {
        logFlushWaitMs: 0,
        runCfCommandImpl: jest.fn(),
        sleepImpl: jest.fn().mockResolvedValue(),
        startLogStreamImpl,
        waitForTaskImpl: jest.fn(afterRestarts('SUCCEEDED')),
      });

      expect(result.exitCode).toBe(0);
      expect(startLogStreamImpl).toHaveBeenCalledTimes(2);
    });

    it('recovers output missed during the disconnect without duplicating streamed lines', async () => {
      const line = (text) =>
        `   2026-10-15T13:30:00.00+0000 [APP/TASK/import-process-prod/0] OUT ${text}`;
      const beforeDrop = line('Validating monitoring data');
      const duringDrop = line('Monitoring Gate: {"status":"success","criticalCount":1}');
      const afterRestart = line('Done in 42.00s.');
      const writeStdout = jest.fn();
      const startLogStreamImpl = jest
        .fn()
        .mockImplementationOnce((_app, _task, out) => {
          out(`${beforeDrop}\n`);
          return droppedStream();
        })
        .mockImplementationOnce((_app, _task, out) => {
          out(`${afterRestart}\n`);
          return healthyStream();
        });
      const runCfCommandImpl = jest.fn((args) =>
        args[0] === 'logs'
          ? [
              'Retrieving logs for app tta-smarthub-prod...',
              beforeDrop,
              line('').replace('import-process-prod', 'other-task'),
              duringDrop,
              afterRestart,
            ].join('\n')
          : undefined
      );

      const result = await runTask(config, {
        logFlushWaitMs: 0,
        runCfCommandImpl,
        sleepImpl: jest.fn().mockResolvedValue(),
        startLogStreamImpl,
        waitForTaskImpl: jest.fn(afterRestarts('SUCCEEDED')),
        writeStdout,
        writeStderr: jest.fn(),
      });

      expect(result.exitCode).toBe(0);
      expect(result.logsRecovered).toBe(true);
      expect(runCfCommandImpl).toHaveBeenCalledWith(['logs', 'tta-smarthub-prod', '--recent']);
      expect(writeStdout.mock.calls.map(([written]) => written)).toEqual([
        `${beforeDrop}\n`,
        `${afterRestart}\n`,
        `${duringDrop}\n`,
      ]);
    });

    it('still succeeds when recovering missed output fails', async () => {
      const runCfCommandImpl = jest.fn((args) => {
        if (args[0] === 'logs') {
          throw new Error('cf logs --recent timed out');
        }
      });

      const result = await runTask(config, {
        logFlushWaitMs: 0,
        runCfCommandImpl,
        sleepImpl: jest.fn().mockResolvedValue(),
        startLogStreamImpl: jest
          .fn()
          .mockReturnValueOnce(droppedStream())
          .mockReturnValueOnce(healthyStream()),
        waitForTaskImpl: jest.fn(afterRestarts('SUCCEEDED')),
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe('SUCCEEDED');
      expect(console.error).toHaveBeenCalledWith(
        'Unable to fetch recent logs for import-process-prod: cf logs --recent timed out'
      );
    });

    it('does not fetch recent logs when the stream never dropped', async () => {
      const runCfCommandImpl = jest.fn();

      const result = await runTask(config, {
        logFlushWaitMs: 0,
        runCfCommandImpl,
        startLogStreamImpl: jest.fn(healthyStream),
        waitForTaskImpl: jest.fn().mockResolvedValue('SUCCEEDED'),
      });

      expect(result.logsRecovered).toBeUndefined();
      expect(runCfCommandImpl).not.toHaveBeenCalledWith(expect.arrayContaining(['--recent']));
    });

    it('does not restart the log stream once the task has finished', async () => {
      let endStream;
      const startLogStreamImpl = jest.fn(() => ({
        stop: jest.fn(() => {
          endStream({ code: 1, signal: null, expected: false });
          return Promise.resolve();
        }),
        completion: new Promise((resolve) => {
          endStream = resolve;
        }),
      }));

      await runTask(config, {
        logFlushWaitMs: 0,
        runCfCommandImpl: jest.fn(),
        sleepImpl: jest.fn().mockResolvedValue(),
        startLogStreamImpl,
        waitForTaskImpl: jest.fn().mockResolvedValue('SUCCEEDED'),
      });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      expect(startLogStreamImpl).toHaveBeenCalledTimes(1);
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  it('creates a missing status file and appends a task run record', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-task-status-'));
    const statusFile = path.join(tempDir, 'task-status.json');

    appendTaskRunStatus(statusFile, {
      appName: 'tta-smarthub-prod',
      taskName: 'migrate-prod',
      status: 'SUCCEEDED',
      exitCode: 0,
      startedAt: '2026-03-24T10:00:00.000Z',
      finishedAt: '2026-03-24T10:05:00.000Z',
      timeoutSeconds: 30,
    });

    expect(readStatusFile(statusFile)).toEqual({
      taskRuns: [
        {
          appName: 'tta-smarthub-prod',
          taskName: 'migrate-prod',
          status: 'SUCCEEDED',
          exitCode: 0,
          startedAt: '2026-03-24T10:00:00.000Z',
          finishedAt: '2026-03-24T10:05:00.000Z',
          timeoutSeconds: 30,
        },
      ],
    });
  });

  it('appends to an existing status file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-task-status-'));
    const statusFile = path.join(tempDir, 'task-status.json');
    fs.writeFileSync(
      statusFile,
      JSON.stringify({
        taskRuns: [
          {
            taskName: 'first-task',
            status: 'SUCCEEDED',
          },
        ],
      })
    );

    appendTaskRunStatus(statusFile, {
      appName: 'tta-smarthub-prod',
      taskName: 'second-task',
      status: 'FAILED',
      exitCode: 1,
      startedAt: '2026-03-24T10:10:00.000Z',
      finishedAt: '2026-03-24T10:11:00.000Z',
      timeoutSeconds: 30,
    });

    const statusFileContents = readStatusFile(statusFile);
    expect(statusFileContents.taskRuns).toHaveLength(2);
    expect(statusFileContents.taskRuns[1]).toMatchObject({
      appName: 'tta-smarthub-prod',
      taskName: 'second-task',
      status: 'FAILED',
      exitCode: 1,
    });
  });

  it('throws on an invalid existing status file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-task-status-'));
    const statusFile = path.join(tempDir, 'task-status.json');
    fs.writeFileSync(statusFile, JSON.stringify({ phases: [] }));

    expect(() => readStatusFile(statusFile)).toThrow('expected object with taskRuns array');
  });

  it('builds a task run record with optional command and log file metadata', () => {
    expect(
      buildTaskRunRecord(
        {
          appName: 'tta-smarthub-prod',
          command: 'yarn db:migrate:prod',
          logFile: 'import-artifacts/logs/phase-migrate.log',
          taskName: 'migrate-prod',
          timeoutSeconds: 45,
        },
        {
          status: 'SUCCEEDED',
          exitCode: 0,
          startedAt: '2026-03-24T10:00:00.000Z',
          finishedAt: '2026-03-24T10:05:00.000Z',
        }
      )
    ).toEqual({
      appName: 'tta-smarthub-prod',
      command: 'yarn db:migrate:prod',
      logFile: 'import-artifacts/logs/phase-migrate.log',
      taskName: 'migrate-prod',
      status: 'SUCCEEDED',
      exitCode: 0,
      startedAt: '2026-03-24T10:00:00.000Z',
      finishedAt: '2026-03-24T10:05:00.000Z',
      timeoutSeconds: 45,
    });
  });
});
