/* eslint-disable no-console */

const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);
const NON_TERMINAL_STATUSES = new Set(['PENDING', 'RUNNING']);

class TaskNotFoundError extends Error {
  constructor(taskName) {
    super(`Task ${taskName} not found`);
    this.name = 'TaskNotFoundError';
  }
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
    throw new TaskNotFoundError(taskName);
  }

  const [, , status] = matchedLine.split(/\s+/);
  if (!status) {
    throw new Error(`Task ${taskName} did not include a status`);
  }

  return status;
}

module.exports = {
  NON_TERMINAL_STATUSES,
  TERMINAL_STATUSES,
  TaskNotFoundError,
  parseTaskStatus,
};
