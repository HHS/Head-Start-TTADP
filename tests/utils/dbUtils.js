import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
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
  auditLogger.info(`Loading migrations from ${migrationSet}`);
  const migrationDir = `./src/${migrationSet}`;

  const migrations = fs.readdirSync(migrationDir).map(name => {
    const path = `../../src/${migrationSet}/${name}`;
    const migration = require(path);
    return {
      up: async (params) => await migration.up(params.context, db.Sequelize),
      down: async (params) => await migration.down(params.context, db.Sequelize),
      name,
    }
  })

  const umzug = new Umzug({
    migrations,
    context: db.sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize: db.sequelize }),
    logger: console,
  });

  try {
    const migrations = await umzug.up();
    auditLogger.log('info', `Successfully executed ${migrations.length} migrations.`);
  } catch (error) {
    auditLogger.error('Error executing migrations:', error);
    throw error;
  }

}

export async function reseed() {
  await clear();
  await loadMigrations('migrations');
  await loadMigrations('seeders');
  return true
};

export async function query(command, options = {}) {
  auditLogger.info(`Run query: ${command} - ${options}`)
  return await db.sequelize.query(command, options);
};