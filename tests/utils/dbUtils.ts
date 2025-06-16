import { Sequelize }  from 'sequelize';
import { Umzug, SequelizeStorage, MigrationError } from 'umzug';
import { auditLogger } from '../../src/logger';
import configs from '../../config/config';

const getDB = () => {
  const env = process.env.NODE_ENV || 'development';
  const config = configs[env];

  let sequelize;
  if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
  } else {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
  }

  return {
    sequelize,
    Sequelize,
  };
}

const db = getDB();

const clear = async () => {
  await db.sequelize.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
  `);
};

const loadMigrations = async (migrationSet:string): Promise<void> => {
  const migrationPattern = '*.js'; // File extension pattern for migration files
  const migrationDir = `src/${migrationSet}/${migrationPattern}`; // path.join('./', migrationSet, migrationPattern);

  const umzug = new Umzug({
    storage: new SequelizeStorage({ sequelize: db.sequelize }),
    migrations: {
      glob: migrationDir,
      resolve: ({ name, path, context }) => {
        const migration = require(path);
        return {
            name,
            up: async () => migration.up(context, db.Sequelize),
            down: async () => migration.down(context, db.Sequelize),
        };
      },
    },
    context: db.sequelize.getQueryInterface(),
    logger: { error: console.error, warn: () => {}, info: () => {}, debug: () => {} },
  });

  try {
    const migrations = await umzug.up();

    auditLogger.log('info', `Successfully executed ${migrations.length} migrations.`);
  } catch (error) {
    if (error instanceof MigrationError) {
      auditLogger.error('Error executing migrations:', error.cause, '\n', error);
    }
    auditLogger.error('Error executing migrations:', error);
    throw error;
  }
}

async function reseed() {
  await clear();
  await loadMigrations('migrations');
  await loadMigrations('seeders');
};

async function query(command, options = {}) {
  return await db.sequelize.query(command, options);
};

module.exports = { reseed, query };