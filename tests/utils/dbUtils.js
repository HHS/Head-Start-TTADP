import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import { auditLogger } from '../../src/logger';
import configs from '../../config/config';
import fs from 'fs';
import path from 'path';

const MIGRATION_FILE_PATTERN = /^(\d{8}|\d{14})-[^/\\]+\.js$/;

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

function sortFilenames(filenames) {
  return [...filenames].sort((a, b) => a.localeCompare(b));
}

function resolveMigrationDir(migrationSet) {
  return path.resolve(__dirname, '../../src', migrationSet);
}

function getPrefixDuplicates(filenames) {
  const seen = new Set();
  const duplicates = new Set();

  filenames.forEach((filename) => {
    const [prefix] = filename.split('-');
    if (seen.has(prefix)) {
      duplicates.add(prefix);
      return;
    }
    seen.add(prefix);
  });

  return [...duplicates];
}

function getValidatedMigrationFiles(migrationSet, readDir = fs.readdirSync) {
  const migrationDir = resolveMigrationDir(migrationSet);
  const entries = readDir(migrationDir);
  const jsFiles = sortFilenames(entries.filter((entry) => entry.endsWith('.js') && !entry.startsWith('.')));

  const invalidFiles = jsFiles.filter((entry) => !MIGRATION_FILE_PATTERN.test(entry));
  if (invalidFiles.length > 0) {
    throw new Error(`Invalid ${migrationSet} filename format: ${invalidFiles.join(', ')}`);
  }

  const duplicatePrefixes = getPrefixDuplicates(jsFiles);
  if (duplicatePrefixes.length > 0) {
    auditLogger.warn(`Duplicate filename prefixes found in ${migrationSet}: ${duplicatePrefixes.join(', ')}`);
  }

  return { migrationDir, filenames: jsFiles };
}

export async function clear() {
  await db.sequelize.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
  `);
};

export async function loadMigrations(migrationSet) {
  auditLogger.info(`Loading migrations from ${migrationSet}`);
  const { migrationDir, filenames } = getValidatedMigrationFiles(migrationSet);

  const migrations = filenames.map((name) => {
    const migrationPath = path.resolve(migrationDir, name);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const migration = require(migrationPath);
    if (typeof migration.up !== 'function') {
      throw new Error(`Invalid migration interface in ${name}. Expected an up function.`);
    }
    return {
      up: async (params) => await migration.up(params.context, db.Sequelize),
      down: async (params) => {
        if (typeof migration.down !== 'function') {
          return undefined;
        }
        return migration.down(params.context, db.Sequelize);
      },
      name,
    };
  });

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
  auditLogger.info(`Run query: ${command} - ${JSON.stringify(options)}`);
  return await db.sequelize.query(command, options);
};

export {
  MIGRATION_FILE_PATTERN,
  getPrefixDuplicates,
  getValidatedMigrationFiles,
  resolveMigrationDir,
  sortFilenames,
};
