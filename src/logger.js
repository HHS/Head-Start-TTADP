const pino = require('pino');
const pinoCaller = require('pino-caller');
const pinoHttp = require('pino-http');
const { isTrue } = require('./envParser');

const shouldIncludeCallsite = () => process.env.LOG_INCLUDE_CALLSITE === 'true';

const isPlainObject = (value) =>
  value && typeof value === 'object' && !(value instanceof Error) && !Array.isArray(value);

const normalizeLogArgs = (args) => {
  const [firstArg, secondArg, ...remainingArgs] = args;

  if (typeof firstArg === 'string' && isPlainObject(secondArg)) {
    return [secondArg, firstArg, ...remainingArgs];
  }

  if (firstArg instanceof Error) {
    return [firstArg, secondArg, ...remainingArgs];
  }

  return args;
};

const createBaseLogger = () => {
  const useJSON = isTrue('LOG_JSON_FORMAT');
  const options = {
    base: undefined,
    level: process.env.LOG_LEVEL || 'info',
    messageKey: 'message',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    hooks: {
      logMethod(args, method) {
        method.apply(this, normalizeLogArgs(args));
      },
    },
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.proxyAuthorization',
      'res.headers["set-cookie"]',
    ],
  };

  if (!useJSON) {
    options.transport = {
      target: require.resolve('pino-pretty'),
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        messageKey: 'message',
        translateTime: 'SYS:standard',
      },
    };
  }

  return pino(options);
};

const withCaller = (instance) =>
  pinoCaller(instance, { relativeTo: process.cwd(), stackAdjustment: 1 });

const createAppLogger = () => {
  const baseLogger = createBaseLogger();

  if (!shouldIncludeCallsite()) {
    return baseLogger;
  }

  return withCaller(baseLogger);
};

const logger = createAppLogger();
const httpLogger = createBaseLogger();

const auditLogger = logger.child({ label: 'AUDIT' });
auditLogger.alertError = (message, alertType, err = undefined) => {
  const alertMeta = {
    notify: true,
    alertType,
    logCategory: 'audit',
  };

  if (err !== undefined) {
    alertMeta.err = err;
  }

  auditLogger.error(alertMeta, message);
};

const requestLogger = pinoHttp({
  logger: httpLogger.child({ label: 'REQUEST' }),
  wrapSerializers: false,
  quietReqLogger: true,
  quietResLogger: true,
  customSuccessObject: (req, res, value) => ({
    req: {
      id: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
    },
    res: {
      statusCode: res.statusCode,
    },
    responseTime: value.responseTime,
  }),
  customErrorObject: (req, res, error, value) => ({
    req: {
      id: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
    },
    res: {
      statusCode: res.statusCode,
    },
    err: error,
    responseTime: value.responseTime,
  }),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
  customProps: (req, res) => ({
    userId: req?.session?.userId || res?.locals?.userId,
  }),
});

const errorLogger = {
  error: (message, ...args) => logger.error(message, ...args),
  warn: () => {},
  info: () => {},
  debug: () => {},
  trace: () => {},
};

const testingHooks = {
  shouldIncludeCallsite,
  normalizeLogArgs,
};

export { auditLogger, errorLogger, logger, requestLogger, testingHooks };
