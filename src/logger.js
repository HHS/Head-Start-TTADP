import expressWinston from 'express-winston';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { isTrue } from './envParser';

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
const SPLAT = Symbol.for('splat');

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

const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof Error);

const normalizeLogValue = (value, seen = new WeakSet()) => {
  if (value instanceof Error) {
    return normalizeErrorForLogging(value, seen);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeLogValue(item, seen));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  return Object.entries(value).reduce((acc, [key, propertyValue]) => {
    acc[key] = normalizeLogValue(propertyValue, seen);
    return acc;
  }, {});
};

const isNormalizedError = (value) =>
  isPlainObject(value) && typeof value.name === 'string' && typeof value.message === 'string';

const applySplatMetadata = (info, splatValues) => {
  const metadata = {};
  const extraArgs = [];
  let err = info.err;

  splatValues
    .map((value) => normalizeLogValue(value))
    .forEach((value) => {
      if (isNormalizedError(value)) {
        if (!err) {
          err = value;
        } else {
          extraArgs.push(value);
        }
        return;
      }

      if (isPlainObject(value)) {
        Object.assign(metadata, value);
        return;
      }

      extraArgs.push(value);
    });

  return {
    ...metadata,
    ...(err ? { err } : {}),
    ...(extraArgs.length ? { extraArgs } : {}),
  };
};

const errorMetadataFormatter = format((info) => {
  const normalizedInfo = { ...info };

  if (info instanceof Error) {
    const err = normalizeErrorForLogging(info);
    normalizedInfo.err = err;
    normalizedInfo.message = err.message;
  }

  if (info.message instanceof Error) {
    normalizedInfo.err = normalizeErrorForLogging(info.message);
    normalizedInfo.message = info.message.message;
  }

  Object.entries(normalizedInfo).forEach(([key, value]) => {
    normalizedInfo[key] = normalizeLogValue(value);
  });

  const splatValues = info[SPLAT];
  if (Array.isArray(splatValues) && splatValues.length > 0) {
    Object.assign(normalizedInfo, applySplatMetadata(normalizedInfo, splatValues));
  }

  return normalizedInfo;
});

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
  errorMetadataFormatter(),
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

const requestLogger = expressWinston.logger({
  transports: [new transports.Console()],
  format: format.combine(format.label({ label: 'REQUEST' }), formatter),
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
  normalizeLogValue,
};

export { auditLogger, errorLogger, logger, normalizeErrorForLogging, requestLogger, testingHooks };
