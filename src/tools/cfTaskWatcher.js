/* eslint-disable no-console */

const { parseArgs } = require('node:util');
const { execSync } = require('child_process');

function parse(argv = process.argv.slice(2)) {
  const parsedArgs = parseArgs({
    args: argv,
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

function checkStatus(appName, taskName, run = runCmd) {
  const output = run(`cf tasks ${appName} | grep ${taskName}`, false);
  const status = output.split(/\s+/)[2];
  return status;
}

function watchTask(appName, taskName, run = runCmd) {
  let complete = false;
  let status;

  while (!complete) {
    status = checkStatus(appName, taskName, run);
    if (status !== 'RUNNING') {
      complete = true;
    } else {
      run('sleep 10', false);
    }
  }

  console.log(`Status: ${status}`);
  if (status === 'SUCCEEDED') {
    return 0;
  }

  // Wait for task logs to propagate before surfacing the recent error lines.
  run('sleep 15');
  run(`cf logs ${appName} --recent | grep ${taskName} | grep -i "error\\|failed"`);
  console.log('Task failed');
  return 1;
}

function main(argv = process.argv.slice(2)) {
  const [appName, taskName] = parse(argv);
  process.exit(watchTask(appName, taskName));
}

module.exports = {
  checkStatus,
  main,
  parse,
  runCmd,
  watchTask,
};
