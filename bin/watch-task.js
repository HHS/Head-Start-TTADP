#!/usr/bin/env node

/* eslint-disable no-continue */
/* eslint-disable no-console */

const { parseArgs } = require('node:util');
const { execSync } = require('child_process');

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

function checkStatus(appName, taskName) {
  const output = runCmd(`cf tasks ${appName} | grep ${taskName}`, false);
  const status = output.split(/\s+/)[2];
  return status;
}

function main() {
  const argv = parse();
  const appName = argv[0];
  const taskName = argv[1];
  let complete = false;
  let status;
  while (!complete) {
    status = checkStatus(appName, taskName);
    if (status !== 'RUNNING') {
      complete = true;
    } else {
      runCmd('sleep 10', false);
    }
  }

  console.log(`Status: ${status}`);
  if (status === 'SUCCEEDED') {
    process.exit(0);
  } else {
  // wait for task logs to propagate
    runCmd('sleep 15');
    runCmd(`cf logs ${appName} --recent | grep ${taskName} | grep -i "error"`);
    console.log('Task failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
