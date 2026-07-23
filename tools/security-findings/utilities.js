const fs = require('node:fs');
const path = require('node:path');

const { JIRA_TICKET_PATTERN, OPERATIONAL_TIME_ZONE } = require('./constants');

function resolveProjectPath(relativePath, cwd = process.cwd()) {
  return path.resolve(cwd, relativePath);
}

function pathExists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function writeJson(jsonPath, data, { flag = 'w' } = {}) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: 'utf8',
    flag,
  });
}

function toGitPath(projectPath) {
  return projectPath.split(path.sep).join('/');
}

function validateGitRevision(revision) {
  if (
    typeof revision !== 'string' ||
    !revision ||
    revision.startsWith('-') ||
    /[\s:\0]/.test(revision) ||
    revision.includes('..') ||
    revision.includes('@{')
  ) {
    throw new Error(`Invalid --previous-pending-ref ${JSON.stringify(revision)}`);
  }

  return revision;
}

function isMissingGitObjectError(stderr) {
  return (
    stderr.includes('exists on disk, but not in') ||
    stderr.includes('invalid object name') ||
    stderr.includes('unknown revision or path not in the working tree') ||
    stderr.includes('bad revision') ||
    stderr.includes('Needed a single revision') ||
    (stderr.includes('path') && stderr.includes('does not exist'))
  );
}

function assertRegisterCanBeSeeded({ registerPath, overwrite = false, cwd = process.cwd() }) {
  const resolvedRegisterPath = resolveProjectPath(registerPath, cwd);
  if (pathExists(resolvedRegisterPath) && !overwrite) {
    throw registerOverwriteError(registerPath);
  }
}

function registerOverwriteError(registerPath) {
  return new Error(
    `Refusing to overwrite existing register ${registerPath}; pass --force only for an intentional full regeneration`
  );
}

function isValidJiraTicket(ticket) {
  return typeof ticket === 'string' && ticket === ticket.trim() && JIRA_TICKET_PATTERN.test(ticket);
}

function validateJiraTicket(ticket, { required = false } = {}) {
  if (ticket === null || ticket === undefined) {
    if (!required) {
      return null;
    }
    throw new Error('seed-register requires --ticket in TTAHUB-1234 format');
  }

  const ticketValue = typeof ticket === 'string' ? ticket.trim() : '';
  if (!isValidJiraTicket(ticketValue)) {
    throw new Error('seed-register requires --ticket in TTAHUB-1234 format');
  }

  return ticketValue;
}

function squashWhitespace(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function validateArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value;
}

function validateObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value;
}

function validateIsoDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be an ISO date in YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a valid ISO date`);
  }

  return value;
}

function operationalDate(value = new Date(), timeZone = OPERATIONAL_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value ${value}`);
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function sanitizeIdComponent(value) {
  return String(value).replace(/[^A-Za-z0-9._-]+/g, '-');
}

function compareDates(left, right) {
  return left.localeCompare(right);
}

function buildSastFindingId(signature) {
  return `SAST-SEMGRP-${signature}`;
}

function buildScaFindingId(scope, advisoryId, moduleName, affectedVersion) {
  return [
    'SCA',
    scope.toUpperCase(),
    sanitizeIdComponent(advisoryId),
    sanitizeIdComponent(moduleName),
    sanitizeIdComponent(affectedVersion),
  ].join('-');
}

function parseOperationalDate(dateValue) {
  validateIsoDate(dateValue, 'dateValue');
  return new Date(`${dateValue}T00:00:00Z`);
}

function businessDaysSince(firstSeen, observedOn) {
  if (compareDates(firstSeen, observedOn) > 0) {
    throw new Error(`firstSeen ${firstSeen} cannot be after observedOn ${observedOn}`);
  }

  const current = parseOperationalDate(firstSeen);
  const end = parseOperationalDate(observedOn);

  current.setUTCDate(current.getUTCDate() + 1);

  let count = 0;

  while (current <= end) {
    const weekday = current.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      count += 1;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

function calendarDaysBetween(startDate, endDate) {
  const start = parseOperationalDate(startDate);
  const end = parseOperationalDate(endDate);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

module.exports = {
  assertRegisterCanBeSeeded,
  buildSastFindingId,
  buildScaFindingId,
  businessDaysSince,
  calendarDaysBetween,
  compareDates,
  isMissingGitObjectError,
  isValidJiraTicket,
  operationalDate,
  pathExists,
  readJson,
  registerOverwriteError,
  resolveProjectPath,
  sanitizeIdComponent,
  squashWhitespace,
  toGitPath,
  validateArray,
  validateGitRevision,
  validateIsoDate,
  validateJiraTicket,
  validateObject,
  writeJson,
};
