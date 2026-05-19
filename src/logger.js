import expressWinston from 'express-winston';
import stringify from 'safe-stable-stringify';
import { createLogger, format, transports } from 'winston';
import { isTrue } from './envParser';

/**
 * @typedef {import('winston').Logger & {
 *   alertError: (message: string, alertType: string, err?: unknown) => void
 * }} AuditLogger
 */

const normalizeLogValue = (value, seen = new WeakSet()) => {
  if (value instanceof Error) {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    return Object.getOwnPropertyNames(value).reduce(
      (acc, key) => {
        if (key === 'stack') {
          return acc;
        }

        return {
          ...acc,
          [key]: normalizeLogValue(value[key], seen),
        };
      },
      {
        name: value.name,
        message: value.message,
      }
    );
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeLogValue(entry, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    return Object.entries(value).reduce(
      (acc, [key, entry]) => ({
        ...acc,
        [key]: normalizeLogValue(entry, seen),
      }),
      {}
    );
  }

  return value;
};

const normalizeLogInfo = format((info) => {
  Object.entries(info).forEach(([key, value]) => {
    info[key] = normalizeLogValue(value);
  });

  return info;
});

const formatFunc = ({ level, message, label, timestamp, meta = {}, ...fields }) => {
  const combinedMeta = { ...normalizeLogValue(meta), ...normalizeLogValue(fields) };
  return `${timestamp} ${label || '-'} ${level}: ${message} ${stringify(combinedMeta)}`;
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
  normalizeLogInfo(),
  isTrue('LOG_JSON_FORMAT') ? jsonFormatter : stringFormatter
);
const level = process.env.LOG_LEVEL || 'info';

const buildErrorLogEntry = (message, err) => {
  const { message: _message, name: _name, stack: _stack, ...metadata } = err;
  return {
    level: 'error',
    message,
    err: err,
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
  normalizeLogValue,
};

export { auditLogger, errorLogger, logger, requestLogger, testingHooks, withLogMetadata };
