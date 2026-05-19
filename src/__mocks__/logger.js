const createMockLogger = () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  log: jest.fn(),
});

const auditLogger = createMockLogger();
const logger = createMockLogger();

// Express-winston logger is typically a middleware function
const requestLogger = jest.fn((req, res, next) => (next ? next() : undefined));

const errorLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
};

const normalizeErrorForLogging = jest.fn((error) => {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
});

const withLogMetadata = jest.fn((error, metadata) => Object.assign(error, metadata));

module.exports = {
  __esModule: true,
  auditLogger,
  logger,
  requestLogger,
  errorLogger,
  normalizeErrorForLogging,
  withLogMetadata,
};
