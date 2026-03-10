const fs = require('fs');

function parseMonitoringUpdates(logText) {
  const lines = logText.split('\n').filter((line) => line.includes('Recent Monitoring Updates:'));
  const latest = lines.at(-1);

  if (!latest) {
    return 'Monitoring Updates:\n```No monitoring update summary found in task logs.```';
  }

  if (latest.includes('Recent Monitoring Updates: []')) {
    return `No new monitoring updates (${new Date().toISOString().slice(0, 10)})`;
  }

  const jsonData = latest.slice(latest.indexOf(':') + 1).trim();
  try {
    const updates = JSON.parse(jsonData);
    if (!Array.isArray(updates) || updates.length === 0) {
      return `No new monitoring updates (${new Date().toISOString().slice(0, 10)})`;
    }

    const goals = updates
      .map(({ recipient, region }) => `${recipient} (Region ${region})`)
      .join('\n');
    return `Monitoring Updates:\n\`\`\`${goals}\`\`\``;
  } catch {
    return 'Monitoring Updates:\n```Unable to parse monitoring update summary from task logs.```';
  }
}

function extractRelevantErrors(logText, limit = 8) {
  const patterns = [
    /RUN_IMPORT_JOB_FAILED/i,
    /Task failed/i,
    /Failed to connect/i,
    /Failed to /i,
    /level":"error/i,
    /\berror\b/i,
  ];

  const matches = logText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => patterns.some((pattern) => pattern.test(line)));

  return [...new Set(matches)].slice(-limit);
}

function buildSuccessMessage(logText) {
  const summary = parseMonitoringUpdates(logText);
  const errors = extractRelevantErrors(logText, 3);

  if (errors.length === 0) {
    return `${summary}\nNo import errors detected in recent task logs.`;
  }

  return `${summary}\nRecent Errors:\n\`\`\`${errors.join('\n')}\`\`\``;
}

function buildFailureMessage(logText, targetEnv, taskName) {
  const errors = extractRelevantErrors(logText);
  const body = errors.length > 0
    ? errors.join('\n')
    : 'No matching error lines were found in cmd_log.txt. Check Cloud Foundry task logs.';

  return [
    `Monitoring import failed in ${targetEnv}.`,
    `Task: ${taskName}`,
    'Recent Errors:',
    `\`\`\`${body}\`\`\``,
  ].join('\n');
}

function writeMonitoringNotifications({
  inputPath,
  successPath,
  failurePath,
  targetEnv,
  taskName,
}) {
  const logText = fs.readFileSync(inputPath, 'utf8');
  fs.writeFileSync(successPath, `${buildSuccessMessage(logText)}\n`);
  fs.writeFileSync(failurePath, `${buildFailureMessage(logText, targetEnv, taskName)}\n`);
}

module.exports = {
  buildFailureMessage,
  buildSuccessMessage,
  extractRelevantErrors,
  parseMonitoringUpdates,
  writeMonitoringNotifications,
};
