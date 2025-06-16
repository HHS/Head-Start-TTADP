import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage, MigrationError } from 'umzug';
import { auditLogger } from '../../src/logger';
import configs from '../../config/config';
import fs from 'fs'

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

export async function clear() {
  await db.sequelize.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
  `);
};

export async function loadMigrations(migrationSet) {
  const migrationPattern = '*.js'; // File extension pattern for migration files
  const migrationDir = `./src/${migrationSet}`; // /${migrationPattern} / path.join('./', migrationSet, migrationPattern);

  const migrations = fs.readdirSync(migrationDir)
    .filter(fn => fn.endsWith('.js'))
    .map(async name => {
      //auditLogger.log('info', `CWD: ${process.cwd()}, importing ./src/${migrationSet}/${name}`)
      const migration = await import(`../../src/${migrationSet}/${name}`);
      return {
        up: async (context) => await migration.up(context, db.Sequelize),
        down: async (context) => await migration.down(context, db.Sequelize),
        name,
      };
  });

  const umzug = new Umzug({
    migrations,
    context: db.sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize:db.sequelize }),
    logger: console,
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

export async function reseed() {
  await clear();
  await loadMigrations('migrations');
  await loadMigrations('seeders');
};

export async function query(command, options = {}) {
  return await db.sequelize.query(command, options);
};