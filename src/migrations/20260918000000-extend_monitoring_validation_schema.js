const { prepMigration } = require('../lib/migration');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.addColumn(
        'ValidationRecords',
        'context',
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction }
      );

      // Adding enforcement here rather than an additional validation.
      await queryInterface.addIndex('Citations', ['mfid'], { unique: true, transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeIndex('Citations', ['mfid'], { transaction });
      await queryInterface.removeColumn('ValidationRecords', 'context', { transaction });
    });
  },
};
