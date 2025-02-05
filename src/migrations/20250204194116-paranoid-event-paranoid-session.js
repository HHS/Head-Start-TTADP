const { prepMigration } = require('../lib/migration');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.addColumn(
        'SessionReportPilots',
        'deletedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        'EventReportPilots',
        'deletedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.removeColumn(
        'SessionReportPilots',
        'deletedAt',
        { transaction },
      );
      await queryInterface.removeColumn(
        'EventReportPilots',
        'deletedAt',
        { transaction },
      );
    });
  },
};
