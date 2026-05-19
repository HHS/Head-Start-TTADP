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

  it('formats string logger output with serialized metadata', () => {
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

  it('formats circular metadata without throwing', () => {
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

  it('formats error details with serialized error metadata', () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
    const { formatFunc } = loadTesting();
    const err = new Error('boom');

    const output = formatFunc({
      level: 'error',
      message: 'alert probe',
      label: 'AUDIT',
      timestamp: '2026-02-20T00:00:00.000Z',
      notify: true,
      alertType: 'test_alert_type',
      logCategory: 'audit',
      err,
    });

    expect(output).toBe(
      '2026-02-20T00:00:00.000Z AUDIT error: alert probe {"alertType":"test_alert_type","err":{"message":"boom","name":"Error"},"logCategory":"audit","notify":true}'
    );
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
    expect(info.err).toMatchObject({
      name: 'Error',
      message: 'boom',
      notify: true,
      alertType: 'test_alert_type',
      logCategory: 'audit',
    });
    expect(info.err.stack).toBeUndefined();
  });

  it('serializes Error instances passed as logger metadata', async () => {
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
      requestId: 'abc-123',
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

  it('serializes Error instances passed after the log message', async () => {
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
