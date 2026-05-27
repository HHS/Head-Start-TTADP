const pino = require('pino');
const pinoHttp = require('pino-http');
const path = require('path');
const { isTrue } = require('./envParser');

const CALLSITE_EXCLUDE_PATTERNS = [
  '/src/logger.js',
  '/node_modules/',
  '/node:internal/',
  'node:internal/',
];
const PAYLOAD_FIELD_NAMES = new Set(['Body', 'body', 'Payload', 'payload']);
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.proxyAuthorization',
  'res.headers["set-cookie"]',
];
const STACK_FRAME_PATTERN = /^\s*at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/;

const prettyTransport = {
  target: require.resolve('pino-pretty'),
  options: {
    colorize: true,
    ignore: 'pid,hostname',
    messageKey: 'message',
    translateTime: 'SYS:standard',
  },
};

const isPlainObject = (value) => {
  return value && typeof value === 'object' && !(value instanceof Error) && !Array.isArray(value);
};

const isBinaryLike = (value) => {
  return Buffer.isBuffer(value) || value instanceof ArrayBuffer || ArrayBuffer.isView(value);
};

const summarizeValue = (value) => {
  if (Buffer.isBuffer(value)) {
    return `[Buffer ${value.length} bytes]`;
  }

  if (value instanceof ArrayBuffer) {
    return `[ArrayBuffer ${value.byteLength} bytes]`;
  }

  if (ArrayBuffer.isView(value)) {
    return `[${value.constructor.name} ${value.byteLength} bytes]`;
  }

  if (typeof value === 'string') {
    return `[String ${Buffer.byteLength(value)} bytes]`;
  }

  return `[${value?.constructor?.name || typeof value}]`;
};

const sanitizeLogValue = (value, seen = new WeakSet(), key = undefined) => {
  if (isBinaryLike(value) || PAYLOAD_FIELD_NAMES.has(key)) {
    return summarizeValue(value);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  if (value instanceof Error) {
    const serialized = pino.stdSerializers.err(value);
    return sanitizeLogValue(serialized, seen);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeLogValue(entry, seen));
  }

  return Object.entries(value).reduce((sanitized, [entryKey, entryValue]) => {
    sanitized[entryKey] = sanitizeLogValue(entryValue, seen, entryKey);
    return sanitized;
  }, {});
};

const normalizeLogArgs = (args) => {
  const [firstArg, secondArg, ...remainingArgs] = args;

  if (typeof firstArg === 'string' && isPlainObject(secondArg)) {
    return [sanitizeLogValue(secondArg), firstArg, ...remainingArgs];
  }

  if (typeof firstArg === 'string' && secondArg instanceof Error) {
    return [{ err: sanitizeLogValue(secondArg) }, firstArg, ...remainingArgs];
  }

  if (firstArg instanceof Error) {
    return [sanitizeLogValue(firstArg), secondArg, ...remainingArgs];
  }

  return args.map((arg) => sanitizeLogValue(arg));
};

const normalizePath = (value) => value.replaceAll('\\', '/');

const toRepoRelativePath = (sourceFile) => {
  const sourceFilePath = normalizePath(sourceFile);
  const relativePath = normalizePath(path.relative(process.cwd(), sourceFilePath));
  return relativePath.startsWith('../') ? sourceFilePath : relativePath;
};

const parseStackLine = (line) => {
  const match = line.match(STACK_FRAME_PATTERN);
  if (!match) {
    return null;
  }

  const [, sourceFunction, sourceFile, sourceLine, sourceColumn] = match;
  return {
    sourceFile,
    sourceLine: Number(sourceLine),
    sourceColumn: Number(sourceColumn),
    sourceFunction: sourceFunction || null,
  };
};

const shouldExcludeFrame = (sourceFile) => {
  if (!sourceFile) {
    return true;
  }

  const normalizedSourceFile = normalizePath(sourceFile);
  return CALLSITE_EXCLUDE_PATTERNS.some((pattern) => normalizedSourceFile.includes(pattern));
};

const formatCallsite = ({ sourceFile, sourceLine, sourceColumn, sourceFunction }) => {
  const location = `${toRepoRelativePath(sourceFile)}:${sourceLine}:${sourceColumn}`;
  return sourceFunction ? `${sourceFunction} (${location})` : location;
};

const getCallsiteFromStack = (stack) => {
  if (!stack) {
    return null;
  }

  const callsite = stack
    .split('\n')
    .slice(1)
    .map(parseStackLine)
    .find((frame) => frame && !shouldExcludeFrame(frame.sourceFile));

  return callsite ? formatCallsite(callsite) : null;
};

const getCallsite = () => {
  const stackContainer = {};
  Error.captureStackTrace(stackContainer, getCallsite);
  return getCallsiteFromStack(stackContainer.stack);
};

const addCallsiteArg = (args) => {
  const caller = getCallsite();
  if (!caller) {
    return args;
  }

  const [firstArg, ...remainingArgs] = args;
  if (isPlainObject(firstArg)) {
    return [{ ...firstArg, caller: firstArg.caller || caller }, ...remainingArgs];
  }

  return [{ caller }, ...args];
};

const withLogMethod = (instance) => {
  instance.log = (level, ...args) => {
    if (typeof instance[level] === 'function') {
      return instance[level](...args);
    }

    return instance.info(level, ...args);
  };

  return instance;
};

const withChildLogger = (instance, childWrapper = (child) => child) => {
  const originalChild = instance.child.bind(instance);
  instance.child = (bindings, options) => childWrapper(originalChild(bindings, options));
  return instance;
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

  return withChildLogger(withLogMethod(pino(options)), withLogMethod);
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

const testingHooks = {
  getCallsiteFromStack,
  normalizeLogArgs,
  parseStackLine,
};

export { auditLogger, logger, requestLogger, testingHooks };
