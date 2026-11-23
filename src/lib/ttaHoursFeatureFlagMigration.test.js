const { FEATURE_FLAGS } = require('../constants');
const { prepMigration, updateUsersFlagsEnum } = require('./migration');
const migration = require('../migrations/20261119120000-add-tta-hours-provided-over-time-feature-flag');

jest.mock('./migration', () => ({
  prepMigration: jest.fn(),
  updateUsersFlagsEnum: jest.fn(),
}));

describe('add TTA hours feature flag migration', () => {
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

    expect(prepMigration).toHaveBeenCalledWith(queryInterface, transaction, expect.any(String));
    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("ADD VALUE IF NOT EXISTS 'tta_hours_provided_over_time'"),
      { transaction }
    );
  });

  it('removes assigned flags before recreating the enum during rollback', async () => {
    await migration.down(queryInterface);

    expect(updateUsersFlagsEnum).toHaveBeenCalledWith(
      queryInterface,
      transaction,
      ['tta_hours_provided_over_time'],
      FEATURE_FLAGS.filter((flag) => flag !== 'tta_hours_provided_over_time')
    );
  });
});
