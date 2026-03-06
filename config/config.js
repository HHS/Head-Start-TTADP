require('dotenv').config();

const isTrue = (value) => value === 'true';

const isQueryLoggingEnabled = isTrue(process.env.LOG_QUERIES);

const singleLineLogger = (
  queryString,
) => console.log(queryString.replace(/\n/g, '\\n')); // eslint-disable-line no-console

const suppressSuccessMessage = isTrue(process.env.SUPPRESS_SUCCESS_MESSAGE);

const sequelizeLogging = isQueryLoggingEnabled ? singleLineLogger : false;

const connectionValidation = async (connection) => {
  try {
    /*
    * The following two checks are based on the default implementation in postgres found:
    * https://github.com/sequelize/sequelize/blob/1b47a0fda94668459d264de41e21802bee8c9328/packages/postgres/src/connection-manager.ts#L252
    */
    // eslint-disable-next-line no-underscore-dangle
    if (connection._invalid) {
      // eslint-disable-next-line no-console
      console.info('Connection invalid');
      return false;
    }
    // eslint-disable-next-line no-underscore-dangle
    if (connection._ending) {
      // eslint-disable-next-line no-console
      console.info('Connection ending');
      return false;
    }

    const queryConfig = {
      text: 'SELECT 1',
      // Set the timeout in milliseconds
      statement_timeout: 1500, // Adjust the timeout value as needed
    };

    const result = await connection.query(queryConfig);

    if (!suppressSuccessMessage) {
      // eslint-disable-next-line no-console
      console.info('Connection validated successfully');
    }
    return !!result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Connection validation failed:', {
      message: error.message,
      stack: error.stack,
      original: error.original,
      name: error.name,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      internalQuery: error.internalQuery,
      severity: error.severity,
    });
    throw error;
  }
};

const commonConfig = {
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  host: (process.env.POSTGRES_HOST || 'localhost'),
  port: (process.env.POSTGRES_PORT || 5432),
  dialect: 'postgres',
  logging: sequelizeLogging,
  logQueryParameters: isQueryLoggingEnabled,
  minifyAliases: true,
  pool: {
    validate: connectionValidation,
  },
};

const withPoolMax = (max) => ({
  ...commonConfig,
  pool: {
    ...commonConfig.pool,
    max,
  },
});

module.exports = {
  development: {
    ...withPoolMax(10),
    seederStorage: 'sequelize',
  },
  test: {
    ...withPoolMax(10),
  },
  dss: {
    ...withPoolMax(10),
    use_env_variable: 'DATABASE_URL',
    host: process.env.POSTGRES_HOST,
  },
  production: {
    ...withPoolMax(30),
    use_env_variable: 'DATABASE_URL',
    host: process.env.POSTGRES_HOST,
    dialectOptions: {
      ssl: true,
    },
  },
};
