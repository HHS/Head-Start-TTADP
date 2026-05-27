const pino = require('pino');
const pinoHttp = require('pino-http');
const { isTrue } = require('./envParser');
const {
  addCallsiteArg,
  addLegacyLogCompatibility,
  normalizeLogArgs,
  sanitizeLogValue,
  serializeRequest,
  serializeResponse,
} = require('./loggerUtils');

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.proxyAuthorization',
  'res.headers["set-cookie"]',
];

const prettyTransport = {
  target: require.resolve('pino-pretty'),
  options: {
    colorize: true,
    ignore: 'pid,hostname',
    messageKey: 'message',
    translateTime: 'SYS:standard',
  },
};

const createLoggerOptions = ({ includeCaller = false } = {}) => ({
  base: undefined,
  level: process.env.LOG_LEVEL || 'info',
  messageKey: 'message',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  hooks: {
    logMethod(args, method) {
      const normalizedArgs = normalizeLogArgs(args);
      method.apply(this, includeCaller ? addCallsiteArg(normalizedArgs) : normalizedArgs);
    },
  },
  serializers: {
    err: (err) => (err instanceof Error ? sanitizeLogValue(err) : err),
  },
  redact: REDACT_PATHS,
});

const createBaseLogger = ({ includeCaller = false } = {}) => {
  const options = createLoggerOptions({ includeCaller });

  if (!isTrue('LOG_JSON_FORMAT')) {
    options.transport = prettyTransport;
  }

  return addLegacyLogCompatibility(pino(options));
};

const logger = createBaseLogger({ includeCaller: true });
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
    req: serializeRequest(req),
    res: serializeResponse(res),
    responseTime: value.responseTime,
  }),
  customErrorObject: (req, res, error, value) => ({
    req: serializeRequest(req),
    res: serializeResponse(res),
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

export { auditLogger, logger, requestLogger };
