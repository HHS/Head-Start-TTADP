import path from 'node:path';
import expressWinston from 'express-winston';
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

const serializeLogValue = (value, seen = new WeakSet()) => {
  if (value instanceof Error) {
    return normalizeErrorForLogging(value, seen);
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeLogValue(item, seen));
  }

  if (value === null || typeof value !== 'object' || value instanceof Date) {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  return Object.entries(value).reduce((acc, [key, propertyValue]) => {
    acc[key] = serializeLogValue(propertyValue, seen);
    return acc;
  }, {});
};

const normalizeErrorForLogging = (error, seen = new WeakSet()) => {
  if (!(error instanceof Error)) {
    return error;
  }

  if (seen.has(error)) {
    return { name: error.name, message: error.message };
  }

  seen.add(error);

  const normalized = Object.getOwnPropertyNames(error).reduce((acc, key) => {
    try {
      acc[key] = serializeLogValue(error[key], seen);
    } catch {
      acc[key] = `[Unable to serialize error property: ${key}]`;
    }
    return acc;
  }, {});

  return {
    name: error.name,
    message: error.message,
    ...(error.stack ? { stack: error.stack } : {}),
    ...normalized,
  };
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
  const combinedMeta = { ...serializeLogValue(meta), ...serializeLogValue(fields) };
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
  format.errors({ stack: true }),
  ...(shouldIncludeCallsite() ? [callsiteFormatter()] : []),
  isTrue('LOG_JSON_FORMAT') ? jsonFormatter : stringFormatter
);
const level = process.env.LOG_LEVEL || 'info';

const buildErrorLogEntry = (message, err) => {
  const normalizedError = normalizeErrorForLogging(err);
  const { message: _message, name: _name, stack: _stack, ...metadata } = normalizedError;
  return {
    level: 'error',
    message,
    err: normalizedError,
    ...metadata,
  };
};

const withLogMetadata = (err, metadata) => Object.assign(err, metadata);

const createErrorLogger =
  (winstonLogger) =>
  (message, err = undefined) => {
    if (typeof message === 'string' && err === undefined) {
      return winstonLogger.log({
        level: 'error',
        message,
      });
    }

    if (typeof message === 'string' && err instanceof Error) {
      return winstonLogger.log(buildErrorLogEntry(message, err));
    }

    throw new TypeError(
      'logger.error accepts logger.error(message) or logger.error(message, error)'
    );
  };

const logger = createLogger({
  level,
  format: formatter,
  transports: [new transports.Console()],
});
logger.error = createErrorLogger(logger);

/** @type {AuditLogger} */
const auditLogger = createLogger({
  level: 'info',
  format: format.combine(format.label({ label: 'AUDIT' }), formatter),
  transports: [new transports.Console()],
});
auditLogger.error = createErrorLogger(auditLogger);

auditLogger.alertError = (message, alertType, err = undefined) => {
  const error =
    err instanceof Error ? err : withLogMetadata(new Error(message), { errorValue: err });
  withLogMetadata(error, {
    notify: true,
    alertType,
    logCategory: 'audit',
  });

  auditLogger.error(message, error);
};

const requestLogger = expressWinston.logger({
  transports: [new transports.Console()],
  format: format.combine(format.label({ label: 'REQUEST' }), formatter),
  dynamicMeta: (req, res) => {
    if (req?.session) {
      return {
        userId: req.session.userId,
      };
    }
    if (res?.locals) {
      return {
        userId: res.locals.userId,
      };
    }
    return {};
  },
});

const errorLogger = {
  // only log errors
  error: (message, err = undefined) => {
    if (typeof message === 'string' && err === undefined) {
      return logger.error(message);
    }

    if (typeof message === 'string' && err instanceof Error) {
      return logger.error(message, err);
    }

    return logger.error(String(message));
  },
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
};

export {
  auditLogger,
  errorLogger,
  logger,
  normalizeErrorForLogging,
  requestLogger,
  testingHooks,
  withLogMetadata,
};
