import { exec } from 'child_process';
import { Umzug, SequelizeStorage, MigrationError } from 'umzug';
import { Sequelize } from 'sequelize'
import path from 'path';
import db from '../../src/models';
import { calledFromTestFileOrDirectory } from './testOnly';

const clear = async () => {
  await db.sequelize.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
  `);
};

const loadMigrations = async (migrationSet:string): Promise<void> => {
  const migrationPattern = '*.js'; // File extension pattern for migration files
  const migrationDir = `src/${migrationSet}/${migrationPattern}`; // path.join('./', migrationSet, migrationPattern);

  console.log(migrationDir);

  const umzug = new Umzug({
    storage: new SequelizeStorage({ sequelize: db.sequelize }),
    migrations: {
      glob: migrationDir,
      resolve: ({ name, path, context }) => {
        const migration = require(path);
        return {
            name,
            up: async () => migration.up(context, Sequelize),
            down: async () => migration.down(context, Sequelize),
        };
      },
    },
    context: db.sequelize.getQueryInterface(),
    logger: console,
  });

  try {
    const migrations = await umzug.up();
    console.log(`Successfully executed ${migrations.length} migrations.`);
  } catch (error) {
    if (error instanceof MigrationError) {
      const original = error.cause;
      console.error('Error executing migrations:', error.cause, '\n', error);
    }
    console.error('Error executing migrations:', error);
    throw error;
  }
}


export const reseed = async () => {
  try {
    if (calledFromTestFileOrDirectory()) {
      await clear();
      await loadMigrations('migrations');
      await loadMigrations('seeders');
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};
