const express = require('express');
const request = require('supertest');

const ORIGINAL_ENV = process.env;
const {
  addCallsiteArg,
  addLegacyLogCompatibility,
  getCallsiteFromStack,
  normalizeLogArgs,
  parseStackLine,
  sanitizeLogValue,
  serializeRequest,
  serializeResponse,
} = require('./loggerUtils');

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

  it('emits audit info logs even when the app log level is higher', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
      LOG_LEVEL: 'error',
    };

    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { auditLogger } = loadLogger();

    auditLogger.info('audit info probe');
    await waitForLogFlush();

    const logEntry = stdoutSpy.mock.calls
      .map(([line]) => line.toString())
      .find((line) => line.includes('audit info probe'));

    expect(logEntry).toBeDefined();
    expect(JSON.parse(logEntry)).toMatchObject({
      label: 'AUDIT',
      level: 'info',
      message: 'audit info probe',
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

  it('returns null when no stack is available for callsite extraction', () => {
    expect(getCallsiteFromStack()).toBeNull();
  });

  it('parses stack lines without a function name', () => {
    expect(parseStackLine(`    at ${process.cwd()}/src/server.js:12:34`)).toEqual({
      sourceFile: `${process.cwd()}/src/server.js`,
      sourceLine: 12,
      sourceColumn: 34,
      sourceFunction: null,
    });
  });

  it('returns null for unparseable stack lines', () => {
    expect(parseStackLine('not a stack frame')).toBeNull();
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

  it('normalizes bare errors with a secondary message', () => {
    const err = new Error('bare boom with context');

    expect(normalizeLogArgs([err, 'secondary context'])).toEqual([
      {
        err: expect.objectContaining({
          message: 'bare boom with context',
          stack: expect.stringContaining('Error: bare boom with context'),
          type: 'Error',
        }),
      },
      'secondary context',
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

  it('summarizes payload-like fields across supported value types', () => {
    const arrayBuffer = new ArrayBuffer(8);
    const typedArray = new Uint8Array(4);

    expect(
      sanitizeLogValue({
        arrayBuffer,
        body: arrayBuffer,
        payload: typedArray,
        Payload: 'raw text',
        Body: { nested: 'object payload' },
      })
    ).toEqual({
      arrayBuffer: '[ArrayBuffer 8 bytes]',
      body: '[ArrayBuffer 8 bytes]',
      payload: '[Uint8Array 4 bytes]',
      Payload: '[String 8 bytes]',
      Body: '[Object]',
    });
  });

  it('sanitizes arrays recursively', () => {
    expect(sanitizeLogValue([{ Body: Buffer.from('abc') }, 'safe'])).toEqual([
      { Body: '[Buffer 3 bytes]' },
      'safe',
    ]);
  });

  it('adds caller metadata to log args without replacing an existing caller', () => {
    const [metadata, message] = addCallsiteArg([
      { caller: 'existing caller', value: 1 },
      'message',
    ]);

    expect(metadata).toEqual({
      caller: 'existing caller',
      value: 1,
    });
    expect(message).toBe('message');
  });

  it('returns original args when caller metadata cannot be resolved', () => {
    const args = ['message'];
    jest.spyOn(Error, 'captureStackTrace').mockImplementationOnce((stackContainer) => {
      stackContainer.stack = '';
    });

    expect(addCallsiteArg(args)).toBe(args);
  });

  it('falls back to info for unknown legacy log levels', () => {
    const childLogger = {
      child: jest.fn(),
      info: jest.fn(),
    };
    childLogger.child.mockReturnValue(childLogger);
    const loggerWithCompatibility = addLegacyLogCompatibility(childLogger);

    loggerWithCompatibility.log('notice', 'legacy fallback probe');

    expect(childLogger.info).toHaveBeenCalledWith('notice', 'legacy fallback probe');
  });

  it('wraps child loggers with legacy log compatibility', () => {
    const childMock = jest.fn();
    const childLogger = {
      child: childMock,
      info: jest.fn(),
    };
    childMock.mockReturnValue(childLogger);
    const parentChildMock = jest.fn(() => childLogger);
    const parentLogger = {
      child: parentChildMock,
      info: jest.fn(),
    };
    const loggerWithCompatibility = addLegacyLogCompatibility(parentLogger);

    const compatibleChild = loggerWithCompatibility.child({ label: 'CHILD' });
    compatibleChild.log('unknown', 'child fallback probe');

    expect(parentChildMock).toHaveBeenCalledWith({ label: 'CHILD' }, undefined);
    expect(childLogger.info).toHaveBeenCalledWith('unknown', 'child fallback probe');
  });

  it('serializes request and response fields used by request logging', () => {
    expect(
      serializeRequest({
        id: 'req-1',
        method: 'POST',
        originalUrl: '/original-url',
        url: '/fallback-url',
      })
    ).toEqual({
      id: 'req-1',
      method: 'POST',
      url: '/original-url',
    });
    expect(serializeRequest({ id: 'req-2', method: 'GET', url: '/fallback-url' })).toEqual({
      id: 'req-2',
      method: 'GET',
      url: '/fallback-url',
    });
    expect(serializeResponse({ statusCode: 418 })).toEqual({ statusCode: 418 });
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

  it('adds session userId to completed request logs', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { requestLogger } = loadLogger();
    const app = express();

    app.use(requestLogger);
    app.use('/session-user', (req, res) => {
      req.session = { userId: 123 };
      res.status(204).end();
    });

    await request(app).get('/session-user').expect(204);
    await waitForLogFlush();

    const logEntry = stdoutSpy.mock.calls
      .map(([line]) => line.toString())
      .find((line) => line.includes('/session-user'));

    expect(JSON.parse(logEntry)).toMatchObject({
      req: {
        method: 'GET',
        url: '/session-user',
      },
      res: {
        statusCode: 204,
      },
      userId: 123,
    });
  });

  it('adds res.locals userId to request error logs', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { requestLogger } = loadLogger();
    const app = express();

    app.use(requestLogger);
    app.use('/locals-user-error', (_req, res) => {
      res.locals.userId = 456;
      res.status(500).end();
    });

    await request(app).get('/locals-user-error').expect(500);
    await waitForLogFlush();

    const logEntry = stdoutSpy.mock.calls
      .map(([line]) => line.toString())
      .find((line) => line.includes('/locals-user-error'));

    expect(JSON.parse(logEntry)).toMatchObject({
      err: {
        message: 'failed with status code 500',
      },
      req: {
        method: 'GET',
        url: '/locals-user-error',
      },
      res: {
        statusCode: 500,
      },
      userId: 456,
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
