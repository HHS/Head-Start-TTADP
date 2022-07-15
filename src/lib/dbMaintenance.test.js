import dbMaintenance from './dbMaintenance';

describe('dbMaintenance', () => {
  it('dbMaintenance', () => {
    expect(async () => {
      await dbMaintenance();
    }).not.toThrow();
  });
});
