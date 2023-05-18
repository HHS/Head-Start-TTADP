import { exec } from 'child_process';
import db from '../../src/models';
import { calledFromTestFileOrDirectory } from './testOnly';

const clear = async () => {
  await db.sequelize.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
  `);
};

const executeCommand = async (
  command: string,
  timeout: number = 5 * 60 * 1000, // 5 minutes
) => {
  return new Promise<void>((resolve, reject) => {
    const migrate = exec(
      `node_modules/.bin/sequelize ${command}`,
      {
        env: process.env,
        timeout,
      },
      err => (err ? reject(err): resolve())
    );

    migrate.stdout?.pipe(process.stdout);
    migrate.stderr?.pipe(process.stderr);
  });
};

export const reseed = async () => {
  if (calledFromTestFileOrDirectory()) {
    await clear();
    await executeCommand('db:migrate');
    await executeCommand('db:seed:all');
    return true;
  }
  return false;
};
