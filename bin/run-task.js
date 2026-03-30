#!/usr/bin/env node

/* eslint-disable no-console */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawn } = require('node:child_process');
const {
  TERMINAL_STATUSES,
  NON_TERMINAL_STATUSES,
  TaskNotFoundError,
  parseTaskStatus,
} = require('./cf-task-utils');

const DEFAULT_TIMEOUT_SECONDS = 1800;
const POLL_INTERVAL_MS = 10000;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function generateTaskName(appName) {
  return `${appName}-task-${Date.now()}-${crypto.randomInt(100000, 999999)}`;
}

function isoNow() {
  return new Date().toISOString();
}

function hasTaskName(args) {
  return args.some((arg, index) => arg === '--name' || arg.startsWith('--name=') || (index > 0 && args[index - 1] === '--name'));
}

function getTaskName(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--name') {
      return args[index + 1];
    }
    if (arg.startsWith('--name=')) {
      return arg.slice('--name='.length);
    }
  }
  return null;
}

function getTaskCommand(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--command') {
      return args[index + 1] || null;
    }
    if (arg.startsWith('--command=')) {
      return arg.slice('--command='.length);
    }
  }
  return null;
}

function parseCliArgs(argv, env = process.env) {
  const [appName, ...rawArgs] = argv;
  if (!appName) {
    throw new Error(
      'Usage: run-task <app_name> [--status-file <path>] [--log-file <path>] [cf run-task args...] [--timeout <seconds>]',
    );
  }

  const passthroughArgs = [];
  let timeoutValue = env.CF_TASK_TIMEOUT_SECONDS || `${DEFAULT_TIMEOUT_SECONDS}`;
  let statusFile = null;
  let logFile = null;

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === '--timeout') {
      timeoutValue = rawArgs[index + 1];
      index += 1;
    } else if (arg.startsWith('--timeout=')) {
      timeoutValue = arg.slice('--timeout='.length);
    } else if (arg === '--status-file') {
      statusFile = rawArgs[index + 1];
      index += 1;
    } else if (arg.startsWith('--status-file=')) {
      statusFile = arg.slice('--status-file='.length);
    } else if (arg === '--log-file') {
      logFile = rawArgs[index + 1];
      index += 1;
    } else if (arg.startsWith('--log-file=')) {
      logFile = arg.slice('--log-file='.length);
    } else {
      passthroughArgs.push(arg);
    }
  }

  const timeoutSeconds = Number.parseInt(timeoutValue, 10);

  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds <= 0) {
    throw new Error(`Invalid timeout: ${timeoutValue}`);
  }

  const taskName = getTaskName(passthroughArgs) || generateTaskName(appName);
  const cfArgs = hasTaskName(passthroughArgs)
    ? passthroughArgs
    : [...passthroughArgs, '--name', taskName];

  return {
    appName,
    cfArgs,
    command: getTaskCommand(cfArgs),
    logFile,
    statusFile,
    taskName,
    timeoutSeconds,
  };
}

function runCfCommand(args, options = {}) {
  return execFileSync('cf', args, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function filterLogChunk(chunk, taskName, write) {
  chunk
    .split('\n')
    .filter((line) => line.includes(taskName))
    .forEach((line) => {
      write(`${line}\n`);
    });
}

function startLogStream(
  appName,
  taskName,
  writeStdout = process.stdout.write.bind(process.stdout),
  writeStderr = process.stderr.write.bind(process.stderr),
) {
  const child = spawn('cf', ['logs', appName], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdoutBuffer = '';
  let stderrBuffer = '';
  let settled = false;
  let stopping = false;

  const completion = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({
        code,
        signal,
        expected: stopping,
      });
    });
  });

  child.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop();
    lines.forEach((line) => {
      if (line.includes(taskName)) {
        writeStdout(`${line}\n`);
      }
    });
  });

  child.stderr.on('data', (chunk) => {
    stderrBuffer += chunk.toString();
    const lines = stderrBuffer.split('\n');
    stderrBuffer = lines.pop();
    lines.forEach((line) => {
      if (line.includes(taskName)) {
        writeStderr(`${line}\n`);
      }
    });
  });

  return {
    child,
    completion,
    stop() {
      stopping = true;
      if (stdoutBuffer.includes(taskName)) {
        writeStdout(`${stdoutBuffer}\n`);
      }
      if (stderrBuffer.includes(taskName)) {
        writeStderr(`${stderrBuffer}\n`);
      }
      if (!child.killed) {
        child.kill('SIGTERM');
      }
      return completion.catch(() => null);
    },
  };
}

function getTaskStatus(appName, taskName, runCfCommandImpl = runCfCommand) {
  const output = runCfCommandImpl(['tasks', appName]);
  return parseTaskStatus(output, taskName);
}

async function waitForTask(appName, taskName, options = {}) {
  const {
    timeoutSeconds = DEFAULT_TIMEOUT_SECONDS,
    pollIntervalMs = POLL_INTERVAL_MS,
    runCfCommandImpl = runCfCommand,
    sleepImpl = sleep,
    onStatus = () => {},
  } = options;

  const startedAt = Date.now();
  let previousStatus = null;

  async function poll() {
    let status;
    try {
      status = getTaskStatus(appName, taskName, runCfCommandImpl);
    } catch (error) {
      if (!(error instanceof TaskNotFoundError)) {
        throw error;
      }

      if ((Date.now() - startedAt) >= timeoutSeconds * 1000) {
        throw new Error(`Timed out waiting for task ${taskName} after ${timeoutSeconds} seconds`);
      }

      await sleepImpl(pollIntervalMs);
      return poll();
    }

    if (status !== previousStatus) {
      onStatus(status);
      previousStatus = status;
    }

    if (TERMINAL_STATUSES.has(status)) {
      return status;
    }

    if (!NON_TERMINAL_STATUSES.has(status)) {
      throw new Error(`Unexpected task status: ${status}`);
    }

    if ((Date.now() - startedAt) >= timeoutSeconds * 1000) {
      throw new Error(`Timed out waiting for task ${taskName} after ${timeoutSeconds} seconds`);
    }

    await sleepImpl(pollIntervalMs);
    return poll();
  }

  return poll();
}

function logRecentTaskOutput(appName, taskName, runCfCommandImpl = runCfCommand) {
  try {
    const output = runCfCommandImpl(['logs', appName, '--recent']);
    filterLogChunk(output, taskName, (line) => process.stdout.write(line));
  } catch (error) {
    console.error(`Unable to fetch recent logs for ${taskName}: ${error.message}`);
  }
}

function readStatusFile(statusFilePath, fsImpl = fs) {
  if (!fsImpl.existsSync(statusFilePath)) {
    return { taskRuns: [] };
  }

  let parsed;
  try {
    parsed = JSON.parse(fsImpl.readFileSync(statusFilePath, 'utf-8'));
  } catch (error) {
    throw new Error(`Invalid status file at ${statusFilePath}: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.taskRuns)) {
    throw new Error(`Invalid status file at ${statusFilePath}: expected object with taskRuns array`);
  }

  return parsed;
}

function appendTaskRunStatus(statusFilePath, taskRun, fsImpl = fs, pathImpl = path, osImpl = os) {
  const directory = pathImpl.dirname(statusFilePath);
  fsImpl.mkdirSync(directory, { recursive: true });

  const statusData = readStatusFile(statusFilePath, fsImpl);
  const updatedStatusData = {
    ...statusData,
    taskRuns: [...statusData.taskRuns, taskRun],
  };

  const tempFilePath = pathImpl.join(
    directory,
    `${pathImpl.basename(statusFilePath)}.${process.pid}.${Date.now()}.${crypto.randomUUID()}.tmp`,
  );
  const newline = osImpl.EOL || '\n';

  fsImpl.writeFileSync(tempFilePath, `${JSON.stringify(updatedStatusData, null, 2)}${newline}`);
  fsImpl.renameSync(tempFilePath, statusFilePath);
}

function buildTaskRunRecord(config, result) {
  const record = {
    appName: config.appName,
    taskName: config.taskName,
    status: result.status,
    exitCode: result.exitCode,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    timeoutSeconds: config.timeoutSeconds,
  };

  if (config.command) {
    record.command = config.command;
  }

  if (config.logFile) {
    record.logFile = config.logFile;
  }

  return record;
}

async function runTask(config, dependencies = {}) {
  const {
    runCfCommandImpl = runCfCommand,
    startLogStreamImpl = startLogStream,
    waitForTaskImpl = waitForTask,
  } = dependencies;
  const {
    appName,
    cfArgs,
    taskName,
    timeoutSeconds,
  } = config;
  const startedAt = isoNow();

  console.log(`Starting task ${taskName} on ${appName}`);

  try {
    runCfCommandImpl(['run-task', appName, ...cfArgs], { stdio: 'inherit' });
  } catch (error) {
    const exitCode = error.status || 1;
    console.error(`cf run-task failed with exit code ${exitCode}`);
    return {
      exitCode,
      finishedAt: isoNow(),
      startedAt,
      status: 'FAILED_TO_START',
    };
  }

  const logStream = startLogStreamImpl(appName, taskName);

  try {
    const status = await Promise.race([
      waitForTaskImpl(appName, taskName, {
        timeoutSeconds,
        runCfCommandImpl,
        onStatus: (currentStatus) => {
          console.log(`Task ${taskName} status: ${currentStatus}`);
        },
      }),
      logStream.completion
        ? logStream.completion.then((result) => {
          if (result && !result.expected) {
            throw new Error(`cf logs exited unexpectedly while waiting for task ${taskName}`);
          }
          return new Promise(() => {});
        })
        : new Promise(() => {}),
    ]);

    if (status === 'SUCCEEDED') {
      console.log(`Task ${taskName} completed successfully`);
      return {
        exitCode: 0,
        finishedAt: isoNow(),
        startedAt,
        status,
      };
    }

    console.error(`Task ${taskName} completed with status ${status}`);
    return {
      exitCode: 1,
      finishedAt: isoNow(),
      startedAt,
      status,
    };
  } catch (error) {
    console.error(error.message);
    return {
      exitCode: 1,
      finishedAt: isoNow(),
      startedAt,
      status: 'FAILED',
    };
  } finally {
    if (logStream) {
      await logStream.stop();
    }
  }
}

async function main(argv = process.argv.slice(2)) {
  let config;
  try {
    config = parseCliArgs(argv);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const result = await runTask(config);
  if (result.exitCode !== 0) {
    logRecentTaskOutput(config.appName, config.taskName);
  }

  if (config.statusFile) {
    try {
      appendTaskRunStatus(config.statusFile, buildTaskRunRecord(config, result));
    } catch (error) {
      console.error(error.message);
      process.exit(result.exitCode === 0 ? 1 : result.exitCode);
    }
  }

  process.exit(result.exitCode);
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_TIMEOUT_SECONDS,
  POLL_INTERVAL_MS,
  appendTaskRunStatus,
  buildTaskRunRecord,
  filterLogChunk,
  generateTaskName,
  getTaskCommand,
  getTaskName,
  getTaskStatus,
  hasTaskName,
  isoNow,
  logRecentTaskOutput,
  parseCliArgs,
  readStatusFile,
  runTask,
  startLogStream,
  waitForTask,
};
