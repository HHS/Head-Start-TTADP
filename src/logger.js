import expressWinston from 'express-winston';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { isTrue } from './envParser';

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

let foo;

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

const formatFunc = ({ level, message, label, timestamp, meta = {}, sourceFile, sourceLine }) => {
  const location = sourceFile && sourceLine ? ` (${sourceFile}:${sourceLine})` : '';
  return `${timestamp} ${label || '-'} ${level}: ${message} ${JSON.stringify(meta)}${location}`;
};

const stringFormatter = format.combine(
  format.timestamp(),
  format.colorize(),
  format.align(),
  format.printf(formatFunc)
);

const jsonFormatter = format.combine(format.timestamp(), format.json());

const formatter = format.combine(
  ...(shouldIncludeCallsite() ? [callsiteFormatter()] : []),
  isTrue('LOG_JSON_FORMAT') ? jsonFormatter : stringFormatter
);
const level = process.env.LOG_LEVEL || 'info';

const logger = createLogger({
  level,
  format: formatter,
  transports: [new transports.Console()],
});

const auditLogger = createLogger({
  level: 'info',
  format: format.combine(format.label({ label: 'AUDIT' }), formatter),
  transports: [new transports.Console()],
});

const requestLogger = expressWinston.logger({
  transports: [new transports.Console()],
  format: format.combine(format.label({ label: 'REQUEST' }), formatter),
  dynamicMeta: (req, res) => {
    if (req && req.session) {
      return {
        userId: req.session.userId,
      };
    }
    if (res && res.locals) {
      return {
        userId: res.locals.userId,
      };
    }
    return {};
  },
});

const errorLogger = {
  // only log errors
  error: (message, ...args) => logger.error(message, ...args),
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
};

export { auditLogger, errorLogger, logger, requestLogger, testingHooks };
