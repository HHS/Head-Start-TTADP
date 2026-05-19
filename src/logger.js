import expressWinston from 'express-winston';
import stringify from 'safe-stable-stringify';
import { createLogger, format, transports } from 'winston';
import { isTrue } from './envParser';

/**
 * @typedef {import('winston').Logger & {
 *   alertError: (message: string, alertType: string, err?: unknown) => void
 * }} AuditLogger
 */

const createLogReplacer = () => {
  const seenErrors = new WeakSet();

  return (_key, value) => {
    if (!(value instanceof Error)) {
      return value;
    }

    if (seenErrors.has(value)) {
      return '[Circular]';
    }

    seenErrors.add(value);

    return Object.getOwnPropertyNames(value).reduce(
      (acc, key) => {
        if (key === 'stack') {
          return acc;
        }

        try {
          acc[key] = value[key];
        } catch {
          acc[key] = `[Unable to serialize error property: ${key}]`;
        }
        return acc;
      },
      {
        name: value.name,
        message: value.message,
      }
    );
  };
};

const parseLogValue = (value) => {
  const stringified = stringify(value, createLogReplacer());
  return stringified === undefined ? undefined : JSON.parse(stringified);
};

const normalizeErrorForLogging = (error) => (error instanceof Error ? parseLogValue(error) : error);

const formatFunc = ({ level, message, label, timestamp, meta = {}, ...fields }) => {
  const combinedMeta = { ...parseLogValue(meta), ...parseLogValue(fields) };
  return `${timestamp} ${label || '-'} ${level}: ${message} ${stringify(
    combinedMeta,
    createLogReplacer()
  )}`;
};

const stringFormatter = format.combine(
  format.timestamp(),
  format.colorize(),
  format.align(),
  format.printf(formatFunc)
);

const jsonFormatter = format.combine(format.timestamp(), format.json());

const formatter = format.combine(
  format.errors({ stack: false }),
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
