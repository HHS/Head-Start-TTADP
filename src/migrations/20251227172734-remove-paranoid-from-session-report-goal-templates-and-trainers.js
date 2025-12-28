const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeColumn(
        'SessionReportPilotGoalTemplates',
        'deletedAt',
        { transaction },
      );

      await queryInterface.removeColumn(
        'SessionReportPilotTrainers',
        'deletedAt',
        { transaction },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'SessionReportPilotGoalTemplates',
        'deletedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'SessionReportPilotTrainers',
        'deletedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );
    });
  },
};
