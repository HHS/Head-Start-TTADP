import path from 'path';

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

const getCurrentLine = () => {
  const stackLine = new Error().stack.split('\n')[2];
  const lineMatch = stackLine.match(/:(\d+):\d+\)?$/);
  return Number(lineMatch[1]);
};

describe('logger callsite helpers', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('disables callsite metadata when LOG_INCLUDE_CALLSITE is false', () => {
    process.env = { ...ORIGINAL_ENV, LOG_INCLUDE_CALLSITE: 'false' };

    const { shouldIncludeCallsite } = loadTesting();

    expect(shouldIncludeCallsite()).toBe(false);
  });

  it('enables callsite metadata only when LOG_INCLUDE_CALLSITE is true', () => {
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

  it('extracts first app callsite from stack and returns repo-relative path', () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
    const { getCallsiteFromStack } = loadTesting();

    const appFile = path.join(process.cwd(), 'src', 'services', 'example.js').replaceAll('\\', '/');
    const stack = [
      'Error',
      `    at format.transform (${path.join(process.cwd(), 'src', 'logger.js').replaceAll('\\', '/')} :40:10)`,
      `    at getCallsite (${path.join(process.cwd(), 'node_modules', 'winston', 'lib', 'winston', 'logger.js').replaceAll('\\', '/')} :250:18)`,
      `    at Transform._read (${path.join(process.cwd(), 'node_modules', 'readable-stream', 'lib', '_stream_transform.js').replaceAll('\\', '/')} :166:10)`,
      `    at performThing (${appFile}:25:9)`,
    ]
      .join('\n')
      .replaceAll(' :', ':');

    expect(getCallsiteFromStack(stack)).toEqual({
      sourceFile: 'src/services/example.js',
      sourceLine: 25,
      sourceFunction: 'performThing',
    });
  });

  it('adds location suffix to string formatter output when source metadata exists', () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
    const { formatFunc } = loadTesting();

    const output = formatFunc({
      level: 'info',
      message: 'hello',
      label: 'AUDIT',
      timestamp: '2026-02-20T00:00:00.000Z',
      meta: { userId: 1 },
      sourceFile: 'src/routes/example.js',
      sourceLine: 42,
    });

    expect(output).toBe(
      '2026-02-20T00:00:00.000Z AUDIT info: hello {"userId":1} (src/routes/example.js:42)'
    );
  });

  it('normalizes Error instances into plain objects for logging', () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
    const { normalizeErrorForLogging } = loadTesting();
    const err = new Error('boom');
    err.code = 'E_TEST';

    const normalized = normalizeErrorForLogging(err);

    expect(normalized).toMatchObject({
      name: 'Error',
      message: 'boom',
      code: 'E_TEST',
    });
    expect(normalized.stack).toContain('Error: boom');
  });

  it('includes normalized error details in string formatter output', () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
    const { formatFunc, normalizeErrorForLogging } = loadTesting();
    const err = new Error('boom');

    const output = formatFunc({
      level: 'error',
      message: 'alert probe',
      label: 'AUDIT',
      timestamp: '2026-02-20T00:00:00.000Z',
      notify: true,
      alertType: 'test_alert_type',
      logCategory: 'audit',
      err: normalizeErrorForLogging(err),
    });

    expect(output).toContain('"err":{"stack":"Error: boom');
    expect(output).toContain('"message":"boom"');
    expect(output).toContain('"name":"Error"');
  });

  it('emits the correct source file and line for a real log call', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_INCLUDE_CALLSITE: 'true',
      LOG_JSON_FORMAT: 'true',
    };

    const { logger } = loadLogger();
    const transportSpy = jest.spyOn(logger.transports[0], 'log');

    const expectedLine = getCurrentLine() + 1;
    logger.info('line probe');

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(transportSpy).toHaveBeenCalled();
    const [info] = transportSpy.mock.calls.find(([entry]) => entry.message === 'line probe');
    transportSpy.mockRestore();

    expect(info).toBeDefined();
    expect(info.sourceFile).toBe('src/logger.test.js');
    expect(info.sourceLine).toBe(expectedLine);
  });

  it('emits structured alert metadata for auditLogger.alertError in JSON mode', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { auditLogger } = loadLogger();
    const transportSpy = jest.spyOn(auditLogger.transports[0], 'log');
    const err = new Error('boom');

    auditLogger.alertError('alert probe', 'test_alert_type', err);

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(transportSpy).toHaveBeenCalled();
    const [info] = transportSpy.mock.calls.find(([entry]) => entry.message === 'alert probe');
    transportSpy.mockRestore();

    expect(info).toBeDefined();
    expect(info.notify).toBe(true);
    expect(info.alertType).toBe('test_alert_type');
    expect(info.logCategory).toBe('audit');
    expect(info.err).toMatchObject({ message: 'boom', name: 'Error' });
    expect(info.err.stack).toContain('Error: boom');
  });
});

describe('requestLogger header masking', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  it('redacts cookie and authorization and leaves other headers intact', () => {
    const { maskHeaders } = loadTesting();
    expect(
      maskHeaders({
        Cookie: 'session=s%3Asecret',
        authorization: 'Bearer secret',
        'x-forwarded-for': '1.2.3.4',
        'user-agent': 'jest',
      })
    ).toEqual({
      Cookie: '[REDACTED]',
      authorization: '[REDACTED]',
      'x-forwarded-for': '1.2.3.4',
      'user-agent': 'jest',
    });
  });

  it('does not mutate the original request headers', () => {
    const { requestFilter } = loadTesting();
    const req = { headers: { cookie: 'session=secret' } };
    requestFilter(req, 'headers');
    expect(req.headers.cookie).toBe('session=secret');
  });

  it('writes a request log entry with cookie and authorization redacted', async () => {
    const { EventEmitter } = require('events');
    const { requestLogger } = loadLogger();
    const writes = [];
    const capture = (chunk) => {
      writes.push(String(chunk));
      return true;
    };
    jest.spyOn(process.stdout, 'write').mockImplementation(capture);
    if (console._stdout) {
      jest.spyOn(console._stdout, 'write').mockImplementation(capture);
    }
    const req = {
      method: 'GET',
      url: '/api/test',
      originalUrl: '/api/test',
      headers: {
        cookie: 'session=s%3Asecret',
        authorization: 'Bearer secret-token',
        'auth-impersonation-id': '7',
        referer: 'https://example.com',
      },
      connection: {},
    };
    const res = new EventEmitter();
    res.statusCode = 200;
    res.locals = {};
    res.end = () => {};
    await new Promise((resolve) => {
      requestLogger(req, res, () => {
        res.end();
        setImmediate(resolve);
      });
    });
    jest.restoreAllMocks();
    const output = writes.join('');
    expect(output).toContain('/api/test');
    expect(output).toContain('[REDACTED]');
    expect(output).toContain('https://example.com');
    expect(output).not.toContain('secret');
  });
});
