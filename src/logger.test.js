const ORIGINAL_ENV = process.env;

const loadTesting = () => {
  jest.resetModules();
  // eslint-disable-next-line global-require
  return require('./logger').testingHooks;
};

const loadLogger = () => {
  jest.resetModules();
  // eslint-disable-next-line global-require
  return require('./logger');
};

const waitForLogFlush = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

describe('logger', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('enables caller metadata only when LOG_INCLUDE_CALLSITE is true', () => {
    process.env = { ...ORIGINAL_ENV, LOG_INCLUDE_CALLSITE: 'true' };

    let testing = loadTesting();
    expect(testing.shouldIncludeCallsite()).toBe(true);

    process.env = { ...ORIGINAL_ENV, LOG_INCLUDE_CALLSITE: 'false' };

    testing = loadTesting();
    expect(testing.shouldIncludeCallsite()).toBe(false);

    process.env = { ...ORIGINAL_ENV, LOG_INCLUDE_CALLSITE: '1' };

    testing = loadTesting();
    expect(testing.shouldIncludeCallsite()).toBe(false);
  });

  it('emits pino-caller caller metadata when enabled', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_INCLUDE_CALLSITE: 'true',
      LOG_JSON_FORMAT: 'true',
    };

    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { logger } = loadLogger();

    logger.info('caller probe');
    await waitForLogFlush();

    const logEntry = stdoutSpy.mock.calls
      .map(([line]) => line.toString())
      .find((line) => line.includes('caller probe'));

    expect(logEntry).toBeDefined();
    expect(JSON.parse(logEntry)).toMatchObject({
      message: 'caller probe',
      caller: expect.stringContaining('logger.test.js'),
    });
  });

  it('passes structured alert metadata to auditLogger.alertError', () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { auditLogger } = loadLogger();
    const loggerSpy = jest.spyOn(auditLogger, 'error').mockImplementation(() => {});
    const err = new Error('boom');

    auditLogger.alertError('alert probe', 'test_alert_type', err);

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        notify: true,
        alertType: 'test_alert_type',
        logCategory: 'audit',
        err,
      }),
      'alert probe'
    );
  });

  it('supports legacy auditLogger.log(level, message) calls', () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { auditLogger } = loadLogger();
    const loggerSpy = jest.spyOn(auditLogger, 'info').mockImplementation(() => {});

    auditLogger.log('info', 'legacy log probe');

    expect(loggerSpy).toHaveBeenCalledWith('legacy log probe');
  });
});
