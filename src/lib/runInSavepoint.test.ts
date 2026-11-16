import { auditLogger } from '../logger';
import db, { sequelize } from '../models';
import runInSavepoint from './runInSavepoint';

describe('runInSavepoint', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  it('runs the work', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);

    await runInSavepoint(fn, 'should not log');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('logs and swallows errors', async () => {
    const error = new Error('boom');
    const spy = jest.spyOn(auditLogger, 'error').mockImplementation(() => auditLogger);

    await expect(
      runInSavepoint(() => Promise.reject(error), 'Work failed:')
    ).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith('Work failed:', error);
    spy.mockRestore();
  });

  it('keeps the parent transaction usable after a failed query', async () => {
    const spy = jest.spyOn(auditLogger, 'error').mockImplementation(() => auditLogger);

    const result = await sequelize.transaction(async (transaction) => {
      await runInSavepoint(
        () => sequelize.query('SELECT * FROM "TableThatDoesNotExist"', { transaction }),
        'Query failed:'
      );
      // without the savepoint, Postgres rejects this: "current transaction is aborted"
      return db.User.count({ transaction });
    });

    expect(typeof result).toBe('number');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
