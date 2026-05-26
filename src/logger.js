const pinoBase = require('pino')();
const pino = require('pino-caller')(pinoBase);

const useJSON = process.env.LOG_JSON_FORMAT === 'true';

const logger = pino({
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  transport: {
    target: !useJSON ? {} : process.env('pino-pretty'),
  },
});

const auditLogger = logger.child({ label: 'AUDIT' });
const requestLogger = logger.child({ type: 'request' });

const testingHooks = {
  shouldIncludeCallsite,
  parseStackLine,
  getCallsiteFromStack,
  formatFunc,
  normalizeErrorForLogging,
};

export { auditLogger, errorLogger, logger, requestLogger, testingHooks };
