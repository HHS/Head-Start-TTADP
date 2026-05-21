import expressWinston from 'express-winston';
import { configure } from 'safe-stable-stringify';
import { createLogger, format, transports } from 'winston';
import { isTrue } from './envParser';

/**
 * @typedef {import('winston').Logger & {
 *   alert: (message: string, meta?: unknown) => void,
 *   alertError: (message: string, alertType: string, err?: unknown) => void
 * }} AuditLogger
 */

const filterStackTrace = (stack) =>
  typeof stack === 'string'
    ? stack
        .split('\n')
        .filter((line) => !line.includes('node_modules'))
        .join('\n')
    : stack;

const omittedLogFields = new Set(['parameters', 'sql', 'where']);

const normalizeLogValue = (value, options = {}, seen = new WeakSet()) => {
  if (value instanceof Error) {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    return Object.getOwnPropertyNames(value).reduce(
      (acc, key) => {
        if (options.omitFields?.has(key)) {
          return acc;
        }

        if (key === 'stack' && !options.includeStack) {
          return acc;
        }

        return {
          ...acc,
          [key]:
            key === 'stack'
              ? filterStackTrace(value[key])
              : normalizeLogValue(value[key], options, seen),
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

    return Object.entries(value).reduce((acc, [key, entry]) => {
      if (options.omitFields?.has(key)) {
        return acc;
      }

      return {
        ...acc,
        [key]: normalizeLogValue(entry, options, seen),
      };
    }, {});
  }

  return value;
};

const stringifyOptions = {
  circularValue: undefined,
};

const stringify = configure(stringifyOptions);

const normalizeLogInfo = format((info) => {
  Object.entries(info).forEach(([key, value]) => {
    info[key] = normalizeLogValue(value, { includeStack: true, omitFields: omittedLogFields });
  });

  return info;
});

const formatFunc = ({ level, message, label, timestamp, ...fields }) => {
  const options = { includeStack: true, omitFields: omittedLogFields };
  return `${timestamp} ${label || '-'} ${level}: ${message} ${stringify(
    normalizeLogValue(fields, options)
  )}`;
};

const stringFormatter = format.combine(
  format.timestamp(),
  format.colorize(),
  format.align(),
  format.printf(formatFunc)
);

const jsonFormatter = format.combine(format.timestamp(), format.json(stringifyOptions));

const formatter = format.combine(
  format.errors({ stack: true }),
  normalizeLogInfo(),
  isTrue('LOG_JSON_FORMAT') ? jsonFormatter : stringFormatter
);
const level = process.env.LOG_LEVEL || 'info';

const buildLogEntry = (logLevel, message, meta = undefined, fields = {}) => {
  const entry = {
    level: logLevel,
    message,
    ...fields,
  };

  if (meta !== undefined) {
    entry.meta = meta;
  }

  return entry;
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

const createMessageLogger =
  (winstonLogger, logLevel, fields = {}, methodName = logLevel) =>
  (message, meta = undefined) => {
    if (typeof message !== 'string') {
      throw new TypeError(`logger.${methodName} accepts logger.${methodName}(message, meta?)`);
    }

    return winstonLogger.log(buildLogEntry(logLevel, message, meta, fields));
  };

const applyLoggerContract = (winstonLogger) => {
  winstonLogger.info = createMessageLogger(winstonLogger, 'info');
  winstonLogger.warn = createMessageLogger(winstonLogger, 'warn');
  winstonLogger.error = createMessageLogger(winstonLogger, 'error');
  winstonLogger.alert = createMessageLogger(winstonLogger, 'error', { notify: true });

  // Backwards-compatible alias for older call sites. New code should use alert(message, meta).
  winstonLogger.alertError = (message, _alertType, meta = undefined) =>
    winstonLogger.alert(message, meta);

  return winstonLogger;
};

const logger = createLogger({
  level,
  format: formatter,
  transports: [new transports.Console()],
});
applyLoggerContract(logger);

/** @type {AuditLogger} */
const auditLogger = createLogger({
  level: 'info',
  format: format.combine(format.label({ label: 'AUDIT' }), formatter),
  transports: [new transports.Console()],
});
applyLoggerContract(auditLogger);

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

const testingHooks = {
  formatFunc,
  getSequelizeLogMetadata,
  normalizeLogValue,
  toLogError,
};

export {
  auditLogger,
  getSequelizeLogMetadata,
  logger,
  normalizeLogValue,
  requestLogger,
  testingHooks,
  toLogError,
  withLogMetadata,
};
