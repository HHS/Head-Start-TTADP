const createMockLogger = () => ({
  error: jest.fn(),
  alert: jest.fn(),
  alertError: jest.fn(),
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
  };
});

const normalizeLogValue = normalizeErrorForLogging;
const getSequelizeLogMetadata = jest.fn(() => ({}));
const toLogError = jest.fn((value, metadata = {}) => {
  const error =
    value instanceof Error ? value : Object.assign(new Error(String(value)), { errorValue: value });
  return Object.assign(error, metadata);
});
const withLogMetadata = jest.fn((error, metadata) => Object.assign(error, metadata));

module.exports = {
  __esModule: true,
  auditLogger,
  logger,
  requestLogger,
  errorLogger,
  getSequelizeLogMetadata,
  normalizeErrorForLogging,
  normalizeLogValue,
  toLogError,
  withLogMetadata,
};
