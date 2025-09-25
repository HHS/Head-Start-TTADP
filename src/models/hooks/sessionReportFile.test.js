const { cleanupOrphanFiles } = require('../helpers/orphanCleanupHelper');
const { afterDestroy } = require('./sessionReportFile');

jest.mock('../helpers/orphanCleanupHelper', () => ({
  cleanupOrphanFiles: jest.fn(),
}));

describe('afterDestroy', () => {
  it('calls the cleanupOrphanFiles helper', async () => {
    const sequelize = {};
    const instance = { fileId: 1 };
    const options = {};

    await afterDestroy(sequelize, instance, options);

    expect(cleanupOrphanFiles).toHaveBeenCalledWith(sequelize, instance.fileId);
  });
});
