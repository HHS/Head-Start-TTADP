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

describe('logger helpers', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('formats string logger output with metadata', () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
    const { formatFunc } = loadTesting();

    const output = formatFunc({
      level: 'info',
      message: 'hello',
      label: 'AUDIT',
      timestamp: '2026-02-20T00:00:00.000Z',
      meta: { userId: 1 },
    });

    expect(output).toBe('2026-02-20T00:00:00.000Z AUDIT info: hello {"userId":1}');
  });

  it('normalizes Error instances into plain objects for logging without stacks', () => {
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
    expect(normalized.stack).toBeUndefined();
  });

  it('normalizes nested circular Error metadata', () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
    const { normalizeErrorForLogging } = loadTesting();
    const err = new Error('boom');
    err.parent = { sql: 'select 1' };
    err.parent.self = err.parent;

    const normalized = normalizeErrorForLogging(err);

    expect(normalized.parent).toEqual({
      sql: 'select 1',
      self: '[Circular]',
    });
  });

  it('keeps string formatter output JSON-safe when metadata is circular', () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
    const { formatFunc } = loadTesting();
    const meta = { requestId: 'abc-123' };
    meta.self = meta;

    const output = formatFunc({
      level: 'error',
      message: 'metadata probe',
      label: 'AUDIT',
      timestamp: '2026-02-20T00:00:00.000Z',
      meta,
    });

    expect(output).toBe(
      '2026-02-20T00:00:00.000Z AUDIT error: metadata probe {"requestId":"abc-123","self":"[Circular]"}'
    );
  });

  it('includes normalized error details in string formatter output without stacks', () => {
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

    expect(output).toContain('"message":"boom"');
    expect(output).toContain('"name":"Error"');
    expect(output).not.toContain('"stack"');
    expect(output).not.toContain('Error: boom');
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
    expect(info.err.stack).toBeUndefined();
  });

  it('normalizes Error instances passed as logger metadata', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { logger, withLogMetadata } = loadLogger();
    const transportSpy = jest.spyOn(logger.transports[0], 'log');
    const err = new Error('metadata boom');
    err.parent = {
      sql: 'select * from "Users" where id = $1',
      parameters: [1],
    };

    logger.error('metadata probe', withLogMetadata(err, { requestId: 'abc-123' }));

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(transportSpy).toHaveBeenCalled();
    const [info] = transportSpy.mock.calls.find(([entry]) =>
      entry.message.startsWith('metadata probe')
    );
    transportSpy.mockRestore();

    expect(info).toBeDefined();
    expect(info.requestId).toBe('abc-123');
    expect(info.err).toMatchObject({
      name: 'Error',
      message: 'metadata boom',
      parent: {
        sql: 'select * from "Users" where id = $1',
        parameters: [1],
      },
    });
    expect(info.err.stack).toBeUndefined();
  });

  it('logs a plain error message without an Error object', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { logger } = loadLogger();
    const transportSpy = jest.spyOn(logger.transports[0], 'log');

    logger.error('plain message');

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(transportSpy).toHaveBeenCalled();
    const [info] = transportSpy.mock.calls.find(([entry]) => entry.message === 'plain message');
    transportSpy.mockRestore();

    expect(info).toBeDefined();
    expect(info.err).toBeUndefined();
  });

  it('normalizes Error instances passed after the log message', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { logger } = loadLogger();
    const transportSpy = jest.spyOn(logger.transports[0], 'log');
    const err = new Error('message boom');

    logger.error(err?.message || String(err), err);

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(transportSpy).toHaveBeenCalled();
    const [info] = transportSpy.mock.calls.find(([entry]) => entry.message === 'message boom');
    transportSpy.mockRestore();

    expect(info).toBeDefined();
    expect(info.err).toMatchObject({ name: 'Error', message: 'message boom' });
    expect(info.err.stack).toBeUndefined();
  });

  it('rejects Error instances passed as the log message', () => {
    const { logger } = loadLogger();
    const err = new Error('message boom');

    expect(() => logger.error(err)).toThrow(
      'logger.error accepts logger.error(message) or logger.error(message, error)'
    );
  });
});
