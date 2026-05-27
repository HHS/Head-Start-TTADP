const ORIGINAL_ENV = process.env;
const { getCallsiteFromStack, normalizeLogArgs, sanitizeLogValue } = require('./loggerUtils');

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

  it('emits caller metadata', async () => {
    process.env = {
      ...ORIGINAL_ENV,
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

  it('extracts the first app callsite from a stack', () => {
    const stack = [
      'Error',
      `    at withCaller (${process.cwd()}/src/logger.js:150:18)`,
      `    at getCallsite (${process.cwd()}/src/loggerUtils.js:140:18)`,
      `    at LOG (${process.cwd()}/node_modules/pino/lib/tools.js:75:21)`,
      `    at idFromSessionOrLocals (${process.cwd()}/src/services/currentUser.js:44:19)`,
    ].join('\n');

    expect(getCallsiteFromStack(stack)).toBe(
      'idFromSessionOrLocals (src/services/currentUser.js:44:19)'
    );
  });

  it('normalizes message-first metadata for pino', () => {
    expect(normalizeLogArgs(['message first', { userId: 123 }])).toEqual([
      { userId: 123 },
      'message first',
    ]);
  });

  it('normalizes message-first errors for pino error serialization', () => {
    const err = new Error('boom');

    expect(normalizeLogArgs(['message first', err])).toEqual([
      {
        err: expect.objectContaining({
          message: 'boom',
          stack: expect.stringContaining('Error: boom'),
          type: 'Error',
        }),
      },
      'message first',
    ]);
  });

  it('normalizes bare errors under an err key', () => {
    const err = new Error('bare boom');

    expect(normalizeLogArgs([err])).toEqual([
      {
        err: expect.objectContaining({
          message: 'bare boom',
          stack: expect.stringContaining('Error: bare boom'),
          type: 'Error',
        }),
      },
    ]);
  });

  it('sanitizes remaining metadata args after message-first metadata', () => {
    expect(
      normalizeLogArgs([
        'message first',
        { userId: 123 },
        {
          input: {
            Body: Buffer.from('Grantee Name'),
          },
        },
      ])
    ).toEqual([
      { userId: 123 },
      'message first',
      {
        input: {
          Body: '[Buffer 12 bytes]',
        },
      },
    ]);
  });

  it('preserves repeated object references while replacing circular references', () => {
    const repeated = { key: 'value' };
    const circular = { id: 1 };
    circular.self = circular;

    expect(sanitizeLogValue({ a: repeated, b: repeated, circular })).toEqual({
      a: { key: 'value' },
      b: { key: 'value' },
      circular: {
        id: 1,
        self: '[Circular]',
      },
    });
  });

  it('summarizes binary payloads in log metadata', () => {
    expect(
      normalizeLogArgs([
        'upload failed',
        {
          input: {
            Bucket: 'ttadp-test',
            Key: 'example.csv',
            Body: Buffer.from('Grantee Name'),
          },
        },
      ])
    ).toEqual([
      {
        input: {
          Bucket: 'ttadp-test',
          Key: 'example.csv',
          Body: '[Buffer 12 bytes]',
        },
      },
      'upload failed',
    ]);
  });

  it('summarizes binary payloads on serialized errors', () => {
    const err = new Error('S3 upload failed');
    err.clientName = 'S3Client';
    err.commandName = 'PutObjectCommand';
    err.input = {
      Bucket: 'ttadp-test',
      Key: 'example.csv',
      Body: Buffer.from('Grantee Name'),
    };

    const [metadata] = normalizeLogArgs(['upload failed', err]);

    expect(metadata).toMatchObject({
      err: {
        clientName: 'S3Client',
        commandName: 'PutObjectCommand',
        input: {
          Bucket: 'ttadp-test',
          Key: 'example.csv',
          Body: '[Buffer 12 bytes]',
        },
        message: 'S3 upload failed',
      },
    });
  });

  it('emits summarized binary payloads on logged errors', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { logger } = loadLogger();
    const err = new Error('S3 upload failed');
    err.clientName = 'S3Client';
    err.commandName = 'PutObjectCommand';
    err.input = {
      Bucket: 'ttadp-test',
      Key: 'example.csv',
      Body: Buffer.from('Grantee Name'),
    };

    logger.error('upload failed', err);
    await waitForLogFlush();

    const logEntry = stdoutSpy.mock.calls
      .map(([line]) => line.toString())
      .find((line) => line.includes('upload failed'));

    expect(JSON.parse(logEntry)).toMatchObject({
      err: {
        input: {
          Bucket: 'ttadp-test',
          Key: 'example.csv',
          Body: '[Buffer 12 bytes]',
        },
      },
      message: 'upload failed',
    });
    expect(logEntry).not.toContain('"data"');
  });

  it('emits bare errors under an err key', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { logger } = loadLogger();

    logger.error(new Error('bare emitted boom'));
    await waitForLogFlush();

    const logEntry = stdoutSpy.mock.calls
      .map(([line]) => line.toString())
      .find((line) => line.includes('bare emitted boom'));

    expect(JSON.parse(logEntry)).toMatchObject({
      err: {
        message: 'bare emitted boom',
        type: 'Error',
      },
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

  it('emits app caller metadata for legacy auditLogger.log calls', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { auditLogger } = loadLogger();

    function legacyLoggerProbe() {
      auditLogger.log('warn', 'legacy caller probe');
    }

    legacyLoggerProbe();
    await waitForLogFlush();

    const logEntry = stdoutSpy.mock.calls
      .map(([line]) => line.toString())
      .find((line) => line.includes('legacy caller probe'));

    expect(JSON.parse(logEntry)).toMatchObject({
      caller: expect.stringContaining('src/logger.test.js'),
      message: 'legacy caller probe',
    });
    expect(logEntry).not.toContain('src/logger.js');
  });
});
