import { QueryInterface, Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage, MigrationError, MigrationParams, RunnableMigration } from 'umzug';
import { auditLogger } from '../../src/logger';
import configs from '../../config/config';
import fs from 'fs'
import sequelize from 'sequelize/types/sequelize';

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

  const migrationDir = `./src/${migrationSet}`;
  const migrations = fs.readdirSync(migrationDir).map(name => {
    const migration = import(`../../src/${migrationSet}/${name}`)
    return {
      up: async (params) => await module.up(params.context, sequelize),
      down: async (params) => await migration.down(params.context, sequelize),
      name,
    }
  })

  const umzug = new Umzug({
    migrations,
    context: db.sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize: db.sequelize }),
    logger: console,
  });

}

export async function reseed() {
  await clear();
  await loadMigrations('migrations');
  await loadMigrations('seeders');
};

export async function query(command, options = {}) {
  return await db.sequelize.query(command, options);
};