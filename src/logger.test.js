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

    expect(output).toBe('2026-02-20T00:00:00.000Z AUDIT info: hello {"meta":{"userId":1}}');
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
      '2026-02-20T00:00:00.000Z AUDIT error: metadata probe {"meta":{"requestId":"abc-123","self":"[Circular]"}}'
    );
  });

  it('formats error payloads as serialized meta', () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
    const { formatFunc } = loadTesting();
    const err = new Error('boom');

    const output = formatFunc({
      level: 'error',
      message: 'alert probe',
      label: 'AUDIT',
      timestamp: '2026-02-20T00:00:00.000Z',
      meta: err,
    });

    expect(output).toContain('2026-02-20T00:00:00.000Z AUDIT error: alert probe');
    expect(output).toContain('"meta":{"message":"boom","name":"Error","stack":"Error: boom');
  });

  it('filters node_modules lines from string-formatted stack traces', () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
    const { formatFunc } = loadTesting();
    const err = new Error('boom');
    err.stack = [
      'Error: boom',
      '    at appFunction (/app/src/service.js:10:5)',
      '    at libraryFunction (/app/node_modules/pkg/index.js:20:5)',
      '    at otherAppFunction (/app/src/handler.js:30:5)',
    ].join('\n');

    const output = formatFunc({
      level: 'error',
      message: 'alert probe',
      label: 'AUDIT',
      timestamp: '2026-02-20T00:00:00.000Z',
      meta: err,
    });

    expect(output).toContain('Error: boom');
    expect(output).toContain('/app/src/service.js');
    expect(output).toContain('/app/src/handler.js');
    expect(output).not.toContain('node_modules');
  });

  it('omits error stacks from normalized values by default', () => {
    const { normalizeLogValue } = loadTesting();
    const err = new Error('boom');

    expect(normalizeLogValue(err)).toEqual({
      name: 'Error',
      message: 'boom',
    });
  });

  it('emits error payloads as meta for auditLogger.error in JSON mode', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { auditLogger } = loadLogger();
    const transportSpy = jest.spyOn(auditLogger.transports[0], 'log');
    const err = new Error('boom');

    auditLogger.error('alert probe', err);

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(transportSpy).toHaveBeenCalled();
    const [info] = transportSpy.mock.calls.find(([entry]) => entry.message === 'alert probe');
    transportSpy.mockRestore();

    expect(info).toBeDefined();
    expect(info.label).toBe('AUDIT');
    expect(info.notify).toBeUndefined();
    expect(info.meta).toMatchObject({
      name: 'Error',
      message: 'boom',
    });
    expect(info.meta.stack).toContain('Error: boom');
    expect(info.meta.stack).not.toContain('node_modules');
  });

  it('emits alerts with notify and optional meta without synthetic errors', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { auditLogger } = loadLogger();
    const transportSpy = jest.spyOn(auditLogger.transports[0], 'log');
    const meta = { status: 400, data: { message: 'Failure' } };

    auditLogger.alert('alert probe', meta);

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(transportSpy).toHaveBeenCalled();
    const [info] = transportSpy.mock.calls.find(([entry]) => entry.message === 'alert probe');
    transportSpy.mockRestore();

    expect(info).toBeDefined();
    expect(info).toMatchObject({
      message: 'alert probe',
      notify: true,
      label: 'AUDIT',
      meta,
    });
    expect(info.err).toBeUndefined();
    expect(info.stack).toBeUndefined();
  });

  it('emits alert metadata without a payload when alert receives no meta', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { auditLogger } = loadLogger();
    const transportSpy = jest.spyOn(auditLogger.transports[0], 'log');

    auditLogger.alert('alert probe');

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(transportSpy).toHaveBeenCalled();
    const [info] = transportSpy.mock.calls.find(([entry]) => entry.message === 'alert probe');
    transportSpy.mockRestore();

    expect(info).toBeDefined();
    expect(info).toMatchObject({
      message: 'alert probe',
      notify: true,
      label: 'AUDIT',
    });
    expect(info.err).toBeUndefined();
    expect(info.meta).toBeUndefined();
    expect(info.stack).toBeUndefined();
  });

  it('keeps alertError as a backwards-compatible alias without alertType output', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      LOG_JSON_FORMAT: 'true',
    };

    const { logger } = loadLogger();
    const transportSpy = jest.spyOn(logger.transports[0], 'log');
    const meta = { status: 400 };

    logger.alertError('alert probe', 'legacy_alert_type', meta);

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(transportSpy).toHaveBeenCalled();
    const [info] = transportSpy.mock.calls.find(([entry]) => entry.message === 'alert probe');
    transportSpy.mockRestore();

    expect(info).toMatchObject({
      message: 'alert probe',
      notify: true,
      meta,
    });
    expect(info.alertType).toBeUndefined();
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
    expect(info.requestId).toBeUndefined();
    expect(info.parent).toBeUndefined();
    expect(info.meta.requestId).toBe('abc-123');
    expect(info.meta).toMatchObject({
      name: 'Error',
      message: 'metadata boom',
      parent: {},
    });
    expect(info.meta.parent).not.toHaveProperty('sql');
    expect(info.meta.parent).not.toHaveProperty('parameters');
    expect(info.meta.stack).toContain('Error: metadata boom');
    expect(info.meta.stack).not.toContain('node_modules');
  });

  it('omits SQL-bearing fields when normalizing nested metadata', () => {
    const { normalizeLogValue } = loadTesting();
    const err = new Error('metadata boom');
    err.sql = 'select * from "Users"';
    err.parameters = [1];
    err.where = 'SQL statement "select 1"';
    err.parent = {
      code: '23505',
      constraint: 'Users_email_key',
      detail: 'duplicate key',
      sql: 'insert into "Users" values ($1)',
      parameters: ['email@example.com'],
      where: 'PL/pgSQL function',
    };
    err.original = err.parent;

    const omittedLogFields = new Set(['parameters', 'sql', 'where']);
    const normalized = normalizeLogValue(err, { includeStack: true, omitFields: omittedLogFields });

    expect(normalized).toMatchObject({
      name: 'Error',
      message: 'metadata boom',
      parent: {
        code: '23505',
        constraint: 'Users_email_key',
        detail: 'duplicate key',
      },
      original: '[Circular]',
    });
    expect(normalized).not.toHaveProperty('sql');
    expect(normalized).not.toHaveProperty('parameters');
    expect(normalized).not.toHaveProperty('where');
    expect(normalized.parent).not.toHaveProperty('sql');
    expect(normalized.parent).not.toHaveProperty('parameters');
    expect(normalized.parent).not.toHaveProperty('where');
  });

  it('preserves SQL-bearing fields in normalized values by default', () => {
    const { normalizeLogValue } = loadTesting();
    const err = new Error('metadata boom');
    err.parent = {
      sql: 'insert into "Users" values ($1)',
      parameters: ['email@example.com'],
      where: 'PL/pgSQL function',
    };

    expect(normalizeLogValue(err)).toMatchObject({
      name: 'Error',
      message: 'metadata boom',
      parent: {
        sql: err.parent.sql,
        parameters: err.parent.parameters,
        where: err.parent.where,
      },
    });
  });

  it('wraps non-Error values for logging with metadata', () => {
    const { toLogError } = loadLogger();
    const value = { message: 'object error', code: 500 };

    const err = toLogError(value, { requestErrorId: 123 });

    expect(err).toBeInstanceOf(Error);
    expect(err).toMatchObject({
      message: String(value),
      errorValue: value,
      requestErrorId: 123,
    });
  });

  it('extracts selected Sequelize metadata for structured logging', () => {
    const { getSequelizeLogMetadata } = loadLogger();
    const parent = new Error('relation does not exist');
    parent.sql = 'select * from "MissingTable" where id = $1';
    parent.parameters = [123];
    parent.table = 'MissingTable';
    parent.column = 'id';
    parent.constraint = 'MissingTable_pkey';
    parent.code = '42P01';
    parent.detail = 'MissingTable does not exist';
    parent.hint = 'Check the migration order';
    parent.severity = 'ERROR';
    parent.schema = 'public';
    parent.routine = 'parserOpenTable';

    const metadata = getSequelizeLogMetadata({ parent });

    expect(metadata).toEqual({
      parentTable: parent.table,
      parentColumn: parent.column,
      parentConstraint: parent.constraint,
      parentCode: parent.code,
      parentDetail: parent.detail,
      parentHint: parent.hint,
    });
    expect(metadata).not.toHaveProperty('parentSql');
    expect(metadata).not.toHaveProperty('parentParameters');
    expect(metadata).not.toHaveProperty('parentWhere');
    expect(metadata).not.toHaveProperty('parentSeverity');
    expect(metadata).not.toHaveProperty('parentSchema');
    expect(metadata).not.toHaveProperty('parentRoutine');
  });

  it('adds selected Sequelize metadata to Error instances prepared for logging', () => {
    const { toLogError } = loadLogger();
    const parent = new Error('duplicate key');
    parent.constraint = 'Users_email_key';
    parent.code = '23505';
    const err = new Error('duplicate key');
    err.parent = parent;

    expect(toLogError(err, { requestErrorId: 456 })).toMatchObject({
      message: 'duplicate key',
      parentConstraint: parent.constraint,
      parentCode: parent.code,
      requestErrorId: 456,
    });
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
    expect(info.meta).toBeUndefined();
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
    expect(info.meta).toMatchObject({ name: 'Error', message: 'message boom' });
    expect(info.meta.stack).toContain('Error: message boom');
  });

  it('rejects non-string log messages', () => {
    const { logger } = loadLogger();
    const err = new Error('message boom');

    expect(() => logger.error(err)).toThrow('logger.error accepts logger.error(message, meta?)');
  });
});
