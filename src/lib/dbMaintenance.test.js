import {
  vacuumTables,
  reindexTables,
  dbMaintenance,
} from './dbMaintenance';

describe('dbMaintenance', () => {
  it('dbMaintenance', async () => {
    let error = null;

    try {
      await dbMaintenance();
    } catch (err) {
      error = err;
    }

    expect(error).toBeNull();
  });
  it('fail vacuumTables', async () => {
    let error = null;

    try {
      await vacuumTables([{ schemaname: 'public', relname: 'test' }]);
    } catch (err) {
      error = err;
    }

    expect(error).not.toBeNull();
  });
  it('fail reindexTables', async () => {
    let error = null;

    try {
      await reindexTables([{ schemaname: 'public', relname: 'test' }]);
    } catch (err) {
      error = err;
    }

    expect(error).not.toBeNull();
  });
});
