const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  log: jest.fn(),
};

const auditLogger = { ...mockLogger };
const logger = { ...mockLogger };

// Express-winston logger is typically a middleware function
const requestLogger = jest.fn((req, res, next) => (next ? next() : undefined));

const errorLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
};

module.exports = {
  __esModule: true,
  auditLogger,
  logger,
  requestLogger,
  errorLogger,
};
