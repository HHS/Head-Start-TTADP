const {exec} = require('child_process');
const db = require('../../src/models');
const { calledFromTestFileOrDirectory } = require('./testOnly');

const clear = async () => await db.sequelize.query(`
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
`);

const migrate = async () => await new Promise<void>((resolve, reject) => {
  const migrate = exec(
    'node_modules/.bin/sequelize db:migrate',
    {env: process.env},
    err => (err ? reject(err): resolve())
  );

  // Forward stdout+stderr to this process
  migrate.stdout.pipe(process.stdout);
  migrate.stderr.pipe(process.stderr);
});

const seed = async () => await new Promise<void>((resolve, reject) => {
  const migrate = exec(
    'node_modules/.bin/sequelize db:seed:all',
    {env: process.env},
    err => (err ? reject(err): resolve())
  );

  // Forward stdout+stderr to this process
  migrate.stdout.pipe(process.stdout);
  migrate.stderr.pipe(process.stderr);
});

export const reseed = async () => {
  if (calledFromTestFileOrDirectory()) {
    await clear();
    await migrate();
    await seed();
    return true;
  }
  return false;
};
