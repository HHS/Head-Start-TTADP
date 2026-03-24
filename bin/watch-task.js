#!/usr/bin/env node

/* eslint-disable no-continue */
/* eslint-disable no-console */

const { parseArgs } = require('node:util');
const { execSync } = require('child_process');

const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);
const NON_TERMINAL_STATUSES = new Set(['PENDING', 'RUNNING']);

function parse() {
  const args = process.argv.slice(2);
  const parsedArgs = parseArgs({
    args,
    allowPositionals: true,
  });
  if (parsedArgs.positionals.length !== 2) {
    console.error(`Got ${parsedArgs.positionals.length} args: ${parsedArgs.positionals}`);
    console.error('Usage: watch-task <app_name> <task_name>');
    process.exit(1);
  }
  return parsedArgs.positionals;
}

function runCmd(cmd, verbose = true) {
  if (verbose) { console.log(`Running: ${cmd}`); }
  const output = execSync(cmd, { encoding: 'utf-8' });
  if (verbose) { console.log(output); }
  return output;
}

function parseTaskStatus(output, taskName) {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+\s+/.test(line));

  const matchedLine = lines.find((line) => {
    const [, name] = line.split(/\s+/);
    return name === taskName;
  });

  if (!matchedLine) {
    throw new Error(`Task ${taskName} not found`);
  }

  const [, , status] = matchedLine.split(/\s+/);
  if (!status) {
    throw new Error(`Task ${taskName} did not include a status`);
  }

  return status;
}

function checkStatus(appName, taskName, runCmdImpl = runCmd) {
  const output = runCmdImpl(`cf tasks ${appName}`, false);
  return parseTaskStatus(output, taskName);
}

function logTaskErrors(appName, taskName, runCmdImpl = runCmd) {
  try {
    runCmdImpl(`cf logs ${appName} --recent | grep -F "${taskName}" | grep -i "error"`, true);
  } catch (err) {
    console.log(`Unable to fetch error logs for ${taskName}: ${err.message}`);
  }
}

function watchTask(appName, taskName, runCmdImpl = runCmd) {
  while (true) {
    const status = checkStatus(appName, taskName, runCmdImpl);
    if (TERMINAL_STATUSES.has(status)) {
      return status;
    }
    if (!NON_TERMINAL_STATUSES.has(status)) {
      throw new Error(`Unexpected task status: ${status}`);
    }
    runCmdImpl('sleep 10', false);
  }
}

function main(runCmdImpl = runCmd) {
  const argv = parse();
  const appName = argv[0];
  const taskName = argv[1];
  let status;

  try {
    status = watchTask(appName, taskName, runCmdImpl);
    console.log(`Status: ${status}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (status === 'SUCCEEDED') {
    process.exit(0);
  } else {
    runCmdImpl('sleep 15');
    logTaskErrors(appName, taskName, runCmdImpl);
    console.log('Task failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  TERMINAL_STATUSES,
  NON_TERMINAL_STATUSES,
  parseTaskStatus,
  checkStatus,
  logTaskErrors,
  watchTask,
  main,
};
