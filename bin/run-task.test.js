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
    expect(parsed.cfArgs).toEqual([
      '--command',
      'yarn db:migrate:prod',
      '--name',
      parsed.taskName,
    ]);
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
    expect(parsed.cfArgs).toEqual([
      '--command',
      'yarn db:migrate:prod',
      '--name',
      'migrate-prod',
    ]);
  });

  it('waits through running states until success', async () => {
    const runCfCommandImpl = jest.fn()
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

    await expect(waitForTask('tta-smarthub-prod', 'import-task', {
      runCfCommandImpl,
      sleepImpl,
      pollIntervalMs: 1,
      timeoutSeconds: 5,
      onStatus,
    })).resolves.toBe('SUCCEEDED');

    expect(onStatus).toHaveBeenNthCalledWith(1, 'PENDING');
    expect(onStatus).toHaveBeenNthCalledWith(2, 'RUNNING');
    expect(onStatus).toHaveBeenNthCalledWith(3, 'SUCCEEDED');
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

    await expect(waitForTask('tta-smarthub-prod', 'import-task', {
      runCfCommandImpl,
      sleepImpl,
      pollIntervalMs: 1,
      timeoutSeconds: 0.001,
    })).rejects.toThrow('Timed out waiting for task import-task');
  });

  it('returns zero when launch and task both succeed', async () => {
    const stop = jest.fn().mockResolvedValue();
    const result = await runTask({
      appName: 'tta-smarthub-prod',
      cfArgs: ['--command', 'yarn db:migrate:prod', '--name', 'migrate-prod'],
      command: 'yarn db:migrate:prod',
      taskName: 'migrate-prod',
      timeoutSeconds: 30,
    }, {
      runCfCommandImpl: jest.fn(),
      startLogStreamImpl: jest.fn(() => ({ stop })),
      waitForTaskImpl: jest.fn().mockResolvedValue('SUCCEEDED'),
    });

    expect(result.exitCode).toBe(0);
    expect(result.status).toBe('SUCCEEDED');
    expect(stop).toHaveBeenCalled();
  });

  it('returns non-zero when the task fails after a successful launch', async () => {
    const stop = jest.fn().mockResolvedValue();
    const result = await runTask({
      appName: 'tta-smarthub-prod',
      cfArgs: ['--command', 'yarn db:migrate:prod', '--name', 'migrate-prod'],
      command: 'yarn db:migrate:prod',
      taskName: 'migrate-prod',
      timeoutSeconds: 30,
    }, {
      runCfCommandImpl: jest.fn(),
      startLogStreamImpl: jest.fn(() => ({ stop })),
      waitForTaskImpl: jest.fn().mockResolvedValue('FAILED'),
    });

    expect(result.exitCode).toBe(1);
    expect(result.status).toBe('FAILED');
    expect(stop).toHaveBeenCalled();
  });

  it('returns the cf command exit code when launch fails', async () => {
    const error = new Error('launch failed');
    error.status = 17;
    const result = await runTask({
      appName: 'tta-smarthub-prod',
      cfArgs: ['--command', 'yarn db:migrate:prod', '--name', 'migrate-prod'],
      command: 'yarn db:migrate:prod',
      taskName: 'migrate-prod',
      timeoutSeconds: 30,
    }, {
      runCfCommandImpl: jest.fn(() => {
        throw error;
      }),
      startLogStreamImpl: jest.fn(),
      waitForTaskImpl: jest.fn(),
    });

    expect(result.exitCode).toBe(17);
    expect(result.status).toBe('FAILED_TO_START');
  });

  it('filters only task-specific log lines', () => {
    const lines = [];

    filterLogChunk([
      '2026-03-24T10:00:00Z [APP/TASK/import-task/0] OUT first line',
      '2026-03-24T10:00:01Z [APP/PROC/WEB/0] OUT unrelated',
      '2026-03-24T10:00:02Z [APP/TASK/import-task/0] ERR second line',
    ].join('\n'), 'import-task', (line) => lines.push(line));

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

  it('returns non-zero when cf logs exits unexpectedly before task completion', async () => {
    const completion = Promise.resolve({ code: 1, signal: null, expected: false });
    const stop = jest.fn().mockResolvedValue();

    const result = await runTask({
      appName: 'tta-smarthub-prod',
      cfArgs: ['--command', 'yarn db:migrate:prod', '--name', 'migrate-prod'],
      command: 'yarn db:migrate:prod',
      taskName: 'migrate-prod',
      timeoutSeconds: 30,
    }, {
      runCfCommandImpl: jest.fn(),
      startLogStreamImpl: jest.fn(() => ({ stop, completion })),
      waitForTaskImpl: jest.fn(() => new Promise(() => {})),
    });

    expect(result.exitCode).toBe(1);
    expect(result.status).toBe('FAILED');
    expect(stop).toHaveBeenCalled();
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
      taskRuns: [{
        appName: 'tta-smarthub-prod',
        taskName: 'migrate-prod',
        status: 'SUCCEEDED',
        exitCode: 0,
        startedAt: '2026-03-24T10:00:00.000Z',
        finishedAt: '2026-03-24T10:05:00.000Z',
        timeoutSeconds: 30,
      }],
    });
  });

  it('appends to an existing status file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-task-status-'));
    const statusFile = path.join(tempDir, 'task-status.json');
    fs.writeFileSync(statusFile, JSON.stringify({
      taskRuns: [{
        taskName: 'first-task',
        status: 'SUCCEEDED',
      }],
    }));

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
    expect(buildTaskRunRecord({
      appName: 'tta-smarthub-prod',
      command: 'yarn db:migrate:prod',
      logFile: 'import-artifacts/logs/phase-migrate.log',
      taskName: 'migrate-prod',
      timeoutSeconds: 45,
    }, {
      status: 'SUCCEEDED',
      exitCode: 0,
      startedAt: '2026-03-24T10:00:00.000Z',
      finishedAt: '2026-03-24T10:05:00.000Z',
    })).toEqual({
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
