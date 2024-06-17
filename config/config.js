require('dotenv').config();

const singleLineLogger = (
  queryString,
) => console.log(queryString.replace(/\n/g, '\\n')); // eslint-disable-line no-console

const connectionValidation = async (connection) => {
  try {
    await connection.authenticate();
    // eslint-disable-next-line no-console
    console.info('Connection validated successfully');
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

module.exports = {
  development: {
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: (process.env.POSTGRES_HOST || 'localhost'),
    port: (process.env.POSTGRES_PORT || 5432),
    dialect: 'postgres',
    logging: singleLineLogger,
    logQueryParameters: true,
    minifyAliases: true,
    pool: {
      validate: connectionValidation,
    },
  },
  test: {
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: (process.env.POSTGRES_HOST || 'localhost'),
    port: (process.env.POSTGRES_PORT || 5432),
    dialect: 'postgres',
    logging: false,
    minifyAliases: true,
    pool: {
      validate: connectionValidation,
    },
  },
  dss: {
    use_env_variable: 'DATABASE_URL',
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
    port: (process.env.POSTGRES_PORT || 5432),
    dialect: 'postgres',
    logging: singleLineLogger,
    minifyAliases: true,
    pool: {
      validate: connectionValidation,
    },
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
    port: (process.env.POSTGRES_PORT || 5432),
    dialect: 'postgres',
    logging: singleLineLogger,
    minifyAliases: true,
    dialectOptions: {
      ssl: true,
    },
    pool: {
      validate: connectionValidation,
    },
  },
};
