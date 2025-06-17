import { QueryInterface, Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage, MigrationError, MigrationParams, RunnableMigration } from 'umzug';
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

  const migrationDir = `./src/${migrationSet}`;
  const migrations = fs.readdirSync(migrationDir).map(name => {
    const migration = require(`../../src/${migrationSet}/${name}`)
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


  // const migrationPattern = '*.js'; // File extension pattern for migration files
  // const migrationDir = `./src/${migrationSet}`; // /${migrationPattern} / path.join('./', migrationSet, migrationPattern);
  // const context = db.sequelize.getQueryInterface();

  // const migrations = fs.readdirSync(migrationDir)
  //   .filter(fn => fn.endsWith('.js')) => {
  //     auditLogger.log('info', `CWD: ${process.cwd()}, importing ./src/${migrationSet}/${name}`)
  //     const migration = await import(`../../src/${migrationSet}/${name}`);
  //     return {
  //       name,
  //       up: async () => migration.up(context, Sequelize),
  //       down: async () => migration.down(context, Sequelize),
  //     };
  // };

  // const umzug = new Umzug({
  //   migrations,
  //   context: db.sequelize.getQueryInterface(),
  //   storage: new SequelizeStorage({ sequelize:db.sequelize }),
  //   logger: console,
  // });

  // const migrationPattern = '*.js'; // File extension pattern for migration files
  // const migrationDir = `./src/${migrationSet}/${migrationPattern}`; //

  // const umzug = new Umzug({
  //   storage: new SequelizeStorage({ sequelize: db.sequelize }),
  //   migrations: {
  //     glob: migrationDir,
  //     resolve: ({ name, path, context }) => {
  //       const migration = await import(path);
  //       return {
  //           name,
  //           up: async () => await migration.up(context, db.Sequelize),
  //           down: async () => await migration.down(context, db.Sequelize),
  //       };
  //     },
  //   },
  //   context: db.sequelize.getQueryInterface(),
  //   logger: { error: console.error, warn: () => {}, info: () => {}, debug: () => {} },
  // });


  // const migrationPattern = '*.js'; // File extension pattern for migration files
  // const migrationDir = `./src/${migrationSet}/${migrationPattern}`; //

  // const umzug = new Umzug({
  //   storage: new SequelizeStorage({ sequelize: db.sequelize }),
  //   migrations: {
  //     glob: migrationDir,
  //     resolve: ({ name, path, context }) => {
  //       const migration = await import(path);
  //       return {
  //           name,
  //           up: async () => migration.up(context, db.Sequelize),
  //           down: async () => migration.down(context, db.Sequelize),
  //       };
  //     },
  //   },
  //   context: db.sequelize.getQueryInterface(),
  //   logger: { error: console.error, warn: () => {}, info: () => {}, debug: () => {} },
  // });

  // try {
  //   const executed = await umzug.up();
  //   auditLogger.log('info', `Successfully executed ${executed.length} migrations.`);
  // } catch (error) {
  //     if (error instanceof MigrationError) {
  //       auditLogger.error('Error executing migrations:', error.cause, '\n', error);
  //     }   
  //     auditLogger.error('Error executing migrations:', error);
  //     throw error;
  // }
}

export async function reseed() {
  await clear();
  await loadMigrations('migrations');
  await loadMigrations('seeders');
};

export async function query(command, options = {}) {
  return await db.sequelize.query(command, options);
};