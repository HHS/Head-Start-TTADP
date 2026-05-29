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

const DEFAULT_LOG_LEVEL = 'info';
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

const requestUserId = (req, res) => req?.session?.userId || res?.locals?.userId;

const createRequestLogObject = (req, res, value) => {
  const userId = requestUserId(req, res);
  return {
    req: serializeRequest(req),
    res: serializeResponse(res),
    responseTime: value.responseTime,
    ...(userId !== undefined && userId !== null && { userId }),
  };
};

const createLoggerOptions = ({ includeCaller = false, level = process.env.LOG_LEVEL } = {}) => ({
  base: undefined,
  level: level || DEFAULT_LOG_LEVEL,
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

const createBaseLogger = ({ includeCaller = false, level = process.env.LOG_LEVEL } = {}) => {
  const options = createLoggerOptions({ includeCaller, level });

  if (!isTrue('LOG_JSON_FORMAT')) {
    options.transport = prettyTransport;
  }

  return addLegacyLogCompatibility(pino(options));
};

const logger = createBaseLogger({ includeCaller: true });
const httpLogger = createBaseLogger();

const auditLogger = createBaseLogger({ includeCaller: true, level: DEFAULT_LOG_LEVEL }).child({
  label: 'AUDIT',
});
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
  customSuccessObject: createRequestLogObject,
  customErrorObject: (req, res, error, value) => ({
    ...createRequestLogObject(req, res, value),
    err: error,
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
});

export { auditLogger, logger, requestLogger };
