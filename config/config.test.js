const ORIGINAL_ENV = process.env;

const loadConfig = () => {
  jest.resetModules();
  jest.doMock('dotenv', () => ({
    config: jest.fn(),
  }));
  // eslint-disable-next-line global-require
  return require('./config');
};

const expectQueryLogging = (config, expectedEnabled) => {
  ['development', 'test', 'dss', 'production'].forEach((envName) => {
    if (expectedEnabled) {
      expect(typeof config[envName].logging).toBe('function');
      expect(config[envName].logQueryParameters).toBe(true);
    } else {
      expect(config[envName].logging).toBe(false);
      expect(config[envName].logQueryParameters).toBe(false);
    }
  });
};

describe('sequelize config LOG_QUERIES behavior', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('enables query logging only when LOG_QUERIES=true', () => {
    process.env = { ...ORIGINAL_ENV, LOG_QUERIES: 'true' };
    const config = loadConfig();

    expect(config).toBeDefined();
    expectQueryLogging(config, true);
  });

  it('disables query logging when LOG_QUERIES=false', () => {
    process.env = { ...ORIGINAL_ENV, LOG_QUERIES: 'false' };
    const config = loadConfig();

    expect(config).toBeDefined();
    expectQueryLogging(config, false);
  });

  it('disables query logging when LOG_QUERIES is unset', () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.LOG_QUERIES;
    const config = loadConfig();

    expect(config).toBeDefined();
    expectQueryLogging(config, false);
  });

  it('disables query logging for non-true LOG_QUERIES values', () => {
    process.env = { ...ORIGINAL_ENV, LOG_QUERIES: '1' };
    const config = loadConfig();

    expect(config).toBeDefined();
    expectQueryLogging(config, false);
  });

  it('preserves environment-specific sequelize settings', () => {
    process.env = { ...ORIGINAL_ENV, LOG_QUERIES: 'false' };
    const config = loadConfig();

    expect(config.development.pool.max).toBe(10);
    expect(config.test.pool.max).toBe(10);
    expect(config.dss.pool.max).toBe(10);
    expect(config.production.pool.max).toBe(30);
    expect(typeof config.development.pool.validate).toBe('function');

    expect(config.dss.use_env_variable).toBe('DATABASE_URL');
    expect(config.production.use_env_variable).toBe('DATABASE_URL');
    expect(config.production.dialectOptions).toEqual({ ssl: true });
  });
});
