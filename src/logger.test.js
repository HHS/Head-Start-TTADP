import path from 'path';

const ORIGINAL_ENV = process.env;

const loadLogger = () => {
  jest.resetModules();
  // eslint-disable-next-line global-require
  return require('./logger');
};

describe('logger', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.dontMock('express-winston');
    jest.resetModules();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('always enables callsite metadata', () => {
    process.env = { ...ORIGINAL_ENV, LOG_INCLUDE_CALLSITE: 'false' };

    const { testingHooks } = loadLogger();

    expect(testingHooks.shouldIncludeCallsite()).toBe(true);
  });

  it('extracts the first app callsite from a stack and returns repo-relative metadata', () => {
    const { testingHooks } = loadLogger();
    const appFile = path.join(process.cwd(), 'src', 'services', 'example.js').replaceAll('\\', '/');
    const stack = [
      'Error',
      `    at format.transform (${process.cwd()}/src/logger.js:40:10)`,
      `    at getCallsite (${process.cwd()}/node_modules/winston/lib/winston/logger.js:250:18)`,
      `    at Transform._read (${process.cwd()}/node_modules/readable-stream/lib/_stream_transform.js:166:10)`,
      `    at performThing (${appFile}:25:9)`,
    ].join('\n');

    expect(testingHooks.getCallsiteFromStack(stack)).toEqual({
      sourceFile: 'src/services/example.js',
      sourceLine: 25,
      sourceFunction: 'performThing',
    });
  });

  it('adds callsite metadata to JSON app logs by default', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { logger } = loadLogger();
    const transportSpy = jest
      .spyOn(logger.transports[0], 'log')
      .mockImplementation((_info, next) => next());

    logger.info('caller probe');

    const logEntry = transportSpy.mock.calls.find(([info]) => info.message === 'caller probe')?.[0];

    expect(logEntry).toBeDefined();
    expect(logEntry).toMatchObject({
      message: 'caller probe',
      sourceFile: 'src/logger.test.js',
      sourceLine: expect.any(Number),
    });
  });

  it('adds a location suffix to string formatter output when source metadata exists', () => {
    const { testingHooks } = loadLogger();

    const output = testingHooks.formatFunc({
      level: 'info',
      message: 'hello',
      label: 'AUDIT',
      timestamp: '2026-02-20T00:00:00.000Z',
      meta: { userId: 1 },
      sourceFile: 'src/routes/example.js',
      sourceLine: 42,
    });

    expect(output).toContain('AUDIT info: hello {"userId":1}');
    expect(output).toContain('(src/routes/example.js:42)');
  });

  it('emits audit info logs even when the app log level is higher', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
      LOG_LEVEL: 'error',
    };

    const { auditLogger } = loadLogger();
    const transportSpy = jest
      .spyOn(auditLogger.transports[0], 'log')
      .mockImplementation((_info, next) => next());

    auditLogger.info('audit info probe');

    const logEntry = transportSpy.mock.calls.find(
      ([info]) => info.message === 'audit info probe'
    )?.[0];

    expect(logEntry).toBeDefined();
    expect(logEntry).toMatchObject({
      label: 'AUDIT',
      level: 'info',
      message: 'audit info probe',
    });
  });

  it('passes structured alert metadata to auditLogger.alertError', () => {
    const { auditLogger } = loadLogger();
    const loggerSpy = jest.spyOn(auditLogger, 'error').mockImplementation(() => {});
    const err = new Error('boom');

    auditLogger.alertError('alert probe', 'test_alert_type', err);

    expect(loggerSpy).toHaveBeenCalledWith(
      'alert probe',
      expect.objectContaining({
        notify: true,
        alertType: 'test_alert_type',
        logCategory: 'audit',
        err: expect.objectContaining({
          message: 'boom',
          name: 'Error',
          stack: expect.stringContaining('Error: boom'),
        }),
      })
    );
  });

  it('normalizes nested errors in alert metadata', () => {
    const { testingHooks } = loadLogger();
    const outer = new Error('outer');
    outer.inner = new Error('inner');
    outer.self = outer;

    expect(testingHooks.normalizeErrorForLogging(outer)).toMatchObject({
      message: 'outer',
      name: 'Error',
      inner: {
        message: 'inner',
        name: 'Error',
      },
      self: {
        message: 'outer',
        name: 'Error',
      },
    });
  });

  it('forwards only error-level AWS SDK logger output through errorLogger', () => {
    const { errorLogger, logger } = loadLogger();
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    errorLogger.error('sdk error');
    errorLogger.warn('sdk warn');
    errorLogger.info('sdk info');
    errorLogger.debug('sdk debug');
    errorLogger.trace('sdk trace');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('sdk error');
  });

  it('passes request user metadata extraction to express-winston', () => {
    jest.doMock('express-winston', () => ({
      logger: jest.fn(() => jest.fn()),
    }));

    loadLogger();

    const expressWinston = require('express-winston');
    const options = expressWinston.logger.mock.calls[0][0];

    expect(options.dynamicMeta({ session: { userId: 123 } })).toEqual({ userId: 123 });
    expect(options.dynamicMeta(null, { locals: { userId: 456 } })).toEqual({ userId: 456 });
    expect(options.dynamicMeta()).toEqual({});
  });

  it('reports callsite from the logging call rather than logger internals', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { auditLogger } = loadLogger();
    const transportSpy = jest
      .spyOn(auditLogger.transports[0], 'log')
      .mockImplementation((_info, next) => next());

    function legacyLoggerProbe() {
      auditLogger.log('warn', 'legacy caller probe');
    }

    legacyLoggerProbe();

    const logEntry = transportSpy.mock.calls.find(
      ([info]) => info.message === 'legacy caller probe'
    )?.[0];

    expect(logEntry).toMatchObject({
      sourceFile: 'src/logger.test.js',
      sourceLine: expect.any(Number),
      message: 'legacy caller probe',
    });
  });
});
