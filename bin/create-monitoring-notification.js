#!/usr/bin/env node

const { writeMonitoringNotifications } = require('../src/tools/createMonitoringNotification');

const [
  inputPath,
  successPath,
  failurePath,
  targetEnv,
  taskName,
] = process.argv.slice(2);

if (!inputPath || !successPath || !failurePath || !targetEnv || !taskName) {
  console.error('Usage: create-monitoring-notification <input> <success-output> <failure-output> <target_env> <task_name>');
  process.exit(1);
}

writeMonitoringNotifications({
  inputPath,
  successPath,
  failurePath,
  targetEnv,
  taskName,
});
