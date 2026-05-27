const path = require('path');
const pino = require('pino');

const CALLSITE_EXCLUDE_PATTERNS = [
  '/src/logger.js',
  '/src/loggerUtils.js',
  '/node_modules/',
  '/node:internal/',
  'node:internal/',
];
const PAYLOAD_FIELD_NAMES = new Set(['Body', 'body', 'Payload', 'payload']);
const STACK_FRAME_PATTERN = /^\s*at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/;

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

const sanitizeLogValue = (value, ancestors = [], key = undefined) => {
  if (isBinaryLike(value) || PAYLOAD_FIELD_NAMES.has(key)) {
    return summarizeValue(value);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (ancestors.includes(value)) {
    return '[Circular]';
  }

  if (value instanceof Error) {
    return sanitizeLogValue(pino.stdSerializers.err(value), ancestors);
  }

  const nextAncestors = [...ancestors, value];

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeLogValue(entry, nextAncestors));
  }

  return Object.entries(value).reduce((sanitized, [entryKey, entryValue]) => {
    sanitized[entryKey] = sanitizeLogValue(entryValue, nextAncestors, entryKey);
    return sanitized;
  }, {});
};

const sanitizeRemainingArgs = (args) => args.map((arg) => sanitizeLogValue(arg));

const normalizeLogArgs = (args) => {
  const [firstArg, secondArg, ...remainingArgs] = args;
  const sanitizedRemainingArgs = sanitizeRemainingArgs(remainingArgs);

  if (typeof firstArg === 'string' && isPlainObject(secondArg)) {
    return [sanitizeLogValue(secondArg), firstArg, ...sanitizedRemainingArgs];
  }

  if (typeof firstArg === 'string' && secondArg instanceof Error) {
    return [{ err: sanitizeLogValue(secondArg) }, firstArg, ...sanitizedRemainingArgs];
  }

  if (firstArg instanceof Error) {
    const normalized = [{ err: sanitizeLogValue(firstArg) }];
    if (secondArg !== undefined) {
      normalized.push(sanitizeLogValue(secondArg));
    }
    return [...normalized, ...sanitizedRemainingArgs];
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

const addLegacyLogCompatibility = (instance) => {
  instance.log = (level, ...args) => {
    if (typeof instance[level] === 'function') {
      return instance[level](...args);
    }

    return instance.info(level, ...args);
  };

  const originalChild = instance.child.bind(instance);
  instance.child = (bindings, options) =>
    addLegacyLogCompatibility(originalChild(bindings, options));

  return instance;
};

const serializeRequest = (req) => ({
  id: req.id,
  method: req.method,
  url: req.originalUrl || req.url,
});

const serializeResponse = (res) => ({
  statusCode: res.statusCode,
});

export {
  addCallsiteArg,
  addLegacyLogCompatibility,
  getCallsiteFromStack,
  normalizeLogArgs,
  parseStackLine,
  sanitizeLogValue,
  serializeRequest,
  serializeResponse,
};
