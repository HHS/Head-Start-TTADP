import crypto from 'node:crypto';
import expressWinston from 'express-winston';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { isTrue } from './envParser';

/**
 * One-way, truncated HMAC of an identifier (e.g. an HSES sub/email) for use as a log
 * correlation key. Lets separate log lines be tied to the same login/user without ever
 * writing the identifier itself to logs.
 *
 * Keyed with SESSION_SECRET rather than a bare hash: emails are predictable/directory-sourced,
 * so an unkeyed hash would let anyone with log access hash guessed candidates and match them
 * against logged values, defeating the point of not logging the identifier. If no secret is
 * configured, we skip the hash entirely rather than falling back to a known/empty key, which
 * would be just as guessable as an unkeyed hash.
 * @param {unknown} value
 * @returns {string | undefined}
 */
const hashForLogging = (value) => {
  if (value === undefined || value === null || value === '' || !process.env.SESSION_SECRET) {
    return undefined;
  }
  return crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(String(value))
    .digest('hex')
    .slice(0, 16);
};

/**
 * @typedef {import('winston').Logger & {
 *   alertError: (message: string, alertType: string, err?: unknown) => void
 * }} AuditLogger
 */

const stackFramePattern = /^\s*at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/;
const callsiteExcludePatterns = [
  '/src/logger.js',
  '/node_modules/',
  '/node_modules/winston/',
  '/node_modules/logform/',
  '/node_modules/express-winston/',
  '/node_modules/triple-beam/',
  '/node:internal/',
  'node:internal/',
];

const normalizePath = (value) => value.replaceAll('\\', '/');

const shouldIncludeCallsite = () => process.env.LOG_INCLUDE_CALLSITE === 'true';

const parseStackLine = (line) => {
  const match = line.match(stackFramePattern);
  if (!match) {
    return null;
  }

  const [, sourceFunction, sourceFile, sourceLine] = match;
  return {
    sourceFile,
    sourceLine: Number(sourceLine),
    sourceFunction: sourceFunction || null,
  };
};

const shouldExcludeFrame = (sourceFile) => {
  if (!sourceFile) {
    return true;
  }

  const normalizedSourceFile = normalizePath(sourceFile);
  return callsiteExcludePatterns.some((pattern) => normalizedSourceFile.includes(pattern));
};

const toRepoRelativePath = (sourceFile) => {
  const cwd = process.cwd();
  const sourceFilePath = normalizePath(sourceFile);
  const relativePath = normalizePath(path.relative(cwd, sourceFilePath));
  return relativePath.startsWith('../') ? sourceFilePath : relativePath;
};

const getCallsiteFromStack = (stack) => {
  if (!stack) {
    return null;
  }

  const parsed = stack
    .split('\n')
    .slice(1)
    .map(parseStackLine)
    .find((frame) => frame && !shouldExcludeFrame(frame.sourceFile));

  if (parsed) {
    return {
      sourceFile: toRepoRelativePath(parsed.sourceFile),
      sourceLine: parsed.sourceLine,
      sourceFunction: parsed.sourceFunction || undefined,
    };
  }

  return null;
};

const getCallsite = () => {
  const stackContainer = {};
  Error.captureStackTrace(stackContainer, getCallsite);
  return getCallsiteFromStack(stackContainer.stack);
};

const normalizeErrorForLogging = (value, seen = new WeakSet()) => {
  if (!(value instanceof Error)) {
    return value;
  }

  if (seen.has(value)) {
    return { name: value.name, message: value.message };
  }

  seen.add(value);

  const normalized = Object.getOwnPropertyNames(value).reduce((acc, key) => {
    const propertyValue = value[key];
    acc[key] =
      propertyValue instanceof Error
        ? normalizeErrorForLogging(propertyValue, seen)
        : propertyValue;
    return acc;
  }, {});

  if (!normalized.name) {
    normalized.name = value.name;
  }

  if (!normalized.message) {
    normalized.message = value.message;
  }

  if (!normalized.stack && value.stack) {
    normalized.stack = value.stack;
  }

  return normalized;
};

const callsiteFormatter = format((info) => {
  const callsite = getCallsite();
  if (!callsite) {
    return info;
  }

  return {
    ...info,
    sourceFile: info.sourceFile || callsite.sourceFile,
    sourceLine: info.sourceLine || callsite.sourceLine,
    sourceFunction: info.sourceFunction || callsite.sourceFunction,
  };
});

const formatFunc = ({
  level,
  message,
  label,
  timestamp,
  meta = {},
  sourceFile,
  sourceLine,
  ...fields
}) => {
  const location = sourceFile && sourceLine ? ` (${sourceFile}:${sourceLine})` : '';
  const combinedMeta = { ...meta, ...fields };
  return `${timestamp} ${label || '-'} ${level}: ${message} ${JSON.stringify(combinedMeta)}${location}`;
};

const stringFormatter = format.combine(
  format.timestamp(),
  format.colorize(),
  format.align(),
  format.printf(formatFunc)
);

const jsonFormatter = format.combine(format.timestamp(), format.json());

const formatter = format.combine(
  ...(shouldIncludeCallsite() ? [callsiteFormatter()] : []),
  isTrue('LOG_JSON_FORMAT') ? jsonFormatter : stringFormatter
);
const level = process.env.LOG_LEVEL || 'info';

const logger = createLogger({
  level,
  format: formatter,
  transports: [new transports.Console()],
});

/** @type {AuditLogger} */
const auditLogger = createLogger({
  level: 'info',
  format: format.combine(format.label({ label: 'AUDIT' }), formatter),
  transports: [new transports.Console()],
});

auditLogger.alertError = (message, alertType, err = undefined) => {
  const alertMeta = {
    notify: true,
    alertType,
    logCategory: 'audit',
  };

  if (err !== undefined) {
    alertMeta.err = normalizeErrorForLogging(err);
  }

  auditLogger.error(message, alertMeta);
};

const REDACTED_VALUE = '[REDACTED]';

// Headers that carry credentials or session identifiers.
const SENSITIVE_HEADERS = ['cookie', 'authorization'];

const maskHeaders = (headers) =>
  Object.entries(headers || {}).reduce((acc, [name, value]) => {
    acc[name] = SENSITIVE_HEADERS.includes(name.toLowerCase()) ? REDACTED_VALUE : value;
    return acc;
  }, {});

// express-winston's default filter returns req[propName]; mask sensitive headers before logging.
const requestFilter = (req, propName) =>
  propName === 'headers'
    ? maskHeaders(req.headers)
    : expressWinston.defaultRequestFilter(req, propName);

const requestLogger = expressWinston.logger({
  transports: [new transports.Console()],
  format: format.combine(format.label({ label: 'REQUEST' }), formatter),
  requestFilter,
  dynamicMeta: (req, res) => {
    if (req && req.session) {
      return {
        userId: req.session.userId,
      };
    }
    if (res && res.locals) {
      return {
        userId: res.locals.userId,
      };
    }
    return {};
  },
});

const errorLogger = {
  // only log errors
  error: (message, ...args) => logger.error(message, ...args),
  warn: () => {},
  info: () => {},
  debug: () => {},
  trace: () => {},
};

const testingHooks = {
  shouldIncludeCallsite,
  parseStackLine,
  getCallsiteFromStack,
  formatFunc,
  normalizeErrorForLogging,
  maskHeaders,
  requestFilter,
};

export { auditLogger, errorLogger, hashForLogging, logger, requestLogger, testingHooks };
