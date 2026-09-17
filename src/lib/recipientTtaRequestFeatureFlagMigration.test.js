const { FEATURE_FLAGS } = require('../constants');
const { prepMigration, updateUsersFlagsEnum } = require('./migration');
const migration = require('../migrations/20260916120000-add-recipient-tta-request-feature-flag');

jest.mock('./migration', () => ({
  prepMigration: jest.fn(),
  updateUsersFlagsEnum: jest.fn(),
}));

describe('add recipient TTA request feature flag migration', () => {
  const transaction = {};
  const queryInterface = {
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(async (callback) => callback(transaction)),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds the feature flag within the migration transaction', async () => {
    await migration.up(queryInterface);

    expect(prepMigration).toHaveBeenCalledWith(
      queryInterface,
      transaction,
      expect.stringContaining('20260916120000-add-recipient-tta-request-feature-flag.js')
    );
    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("ADD VALUE IF NOT EXISTS 'recipient_tta_request'"),
      { transaction }
    );
  });

  it('removes assigned flags before recreating the enum during rollback', async () => {
    await migration.down(queryInterface);

    expect(updateUsersFlagsEnum).toHaveBeenCalledWith(
      queryInterface,
      transaction,
      ['recipient_tta_request'],
      FEATURE_FLAGS.filter((flag) => flag !== 'recipient_tta_request')
    );
  });
});
