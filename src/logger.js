import expressWinston from 'express-winston';
import stringify from 'safe-stable-stringify';
import { createLogger, format, transports } from 'winston';
import { isTrue } from './envParser';

/**
 * @typedef {import('winston').Logger & {
 *   alertError: (message: string, alertType: string, err?: unknown) => void
 * }} AuditLogger
 */

const normalizeLogValue = (value, options = {}, seen = new WeakSet()) => {
  if (value instanceof Error) {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    return Object.getOwnPropertyNames(value).reduce(
      (acc, key) => {
        if (key === 'stack' && !options.includeStack) {
          return acc;
        }

        return {
          ...acc,
          [key]: normalizeLogValue(value[key], options, seen),
        };
      },
      {
        name: value.name,
        message: value.message,
      }
    );
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeLogValue(entry, options, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    return Object.entries(value).reduce(
      (acc, [key, entry]) => ({
        ...acc,
        [key]: normalizeLogValue(entry, options, seen),
      }),
      {}
    );
  }

  return value;
};

const normalizeLogInfo = format((info) => {
  Object.entries(info).forEach(([key, value]) => {
    info[key] = normalizeLogValue(value, { includeStack: true });
  });

  return info;
});

const formatFunc = ({ level, message, label, timestamp, meta = {}, ...fields }) => {
  const combinedMeta = {
    ...normalizeLogValue(meta, { includeStack: true }),
    ...normalizeLogValue(fields, { includeStack: true }),
  };
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
  format.errors({ stack: true }),
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

const sequelizeDetailFields = ['table', 'column', 'constraint', 'code', 'detail', 'hint'];

const metadataKey = (prefix, field) =>
  prefix ? `${prefix}${field[0].toUpperCase()}${field.slice(1)}` : field;

const addSequelizeDetails = (details, source, prefix = '') => {
  if (!source || typeof source !== 'object') {
    return details;
  }

  return sequelizeDetailFields.reduce((acc, field) => {
    if (!source[field]) {
      return acc;
    }

    return {
      ...acc,
      [metadataKey(prefix, field)]: source[field],
    };
  }, details);
};

const getSequelizeLogMetadata = (error) => {
  const normalizedError = normalizeLogValue(error);

  if (!normalizedError || typeof normalizedError !== 'object') {
    return {};
  }

  const parent = normalizedError.parent || normalizedError.original || {};
  return addSequelizeDetails(addSequelizeDetails({}, normalizedError), parent, 'parent');
};

const toLogError = (value, metadata = {}) => {
  const error =
    value instanceof Error
      ? value
      : withLogMetadata(new Error(String(value)), { errorValue: value });

  return withLogMetadata(error, {
    ...getSequelizeLogMetadata(error),
    ...metadata,
  });
};

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
  const error = toLogError(
    err instanceof Error ? err : withLogMetadata(new Error(message), { errorValue: err }),
    {
      notify: true,
      alertType,
      logCategory: 'audit',
    }
  );

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
  getSequelizeLogMetadata,
  normalizeLogValue,
  toLogError,
};

export {
  auditLogger,
  errorLogger,
  getSequelizeLogMetadata,
  logger,
  normalizeLogValue,
  requestLogger,
  testingHooks,
  toLogError,
  withLogMetadata,
};
