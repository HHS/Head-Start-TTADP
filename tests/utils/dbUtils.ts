import { Umzug, SequelizeStorage, MigrationError } from 'umzug';
import db from '../../src/models';
import { calledFromTestFileOrDirectory } from './testOnly';
import { auditLogger } from '../../src/logger';

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
    logger: console,
  });

  try {
    const migrations = await umzug.up();
    console.log(migrations);
    auditLogger.log('info', `Successfully executed ${migrations.length} migrations.`);
  } catch (error) {
    if (error instanceof MigrationError) {
      const original = error.cause;
      auditLogger.error('Error executing migrations:', error.cause, '\n', error);
    }
    auditLogger.error('Error executing migrations:', error);
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
