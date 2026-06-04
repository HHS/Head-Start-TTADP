#!/usr/bin/env node

/* eslint-disable no-continue */
/* eslint-disable no-console */

const { parseArgs } = require('node:util');
const { execSync } = require('child_process');
const {
  TERMINAL_STATUSES,
  NON_TERMINAL_STATUSES,
  TaskNotFoundError,
  parseTaskStatus,
} = require('./cf-task-utils');

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
  if (verbose) {
    console.log(`Running: ${cmd}`);
  }
  const output = execSync(cmd, { encoding: 'utf-8' });
  if (verbose) {
    console.log(output);
  }
  return output;
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
  for (;;) {
    let status;
    try {
      status = checkStatus(appName, taskName, runCmdImpl);
    } catch (error) {
      if (!(error instanceof TaskNotFoundError)) {
        throw error;
      }

      runCmdImpl('sleep 10', false);
      continue;
    }

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
