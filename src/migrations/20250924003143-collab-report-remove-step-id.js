const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeColumn('CollabReportSteps', 'collabStepId', { transaction });
      await queryInterface.removeColumn('CollabReportSteps', 'collabStepPriority', { transaction });

      await queryInterface.changeColumn('CollabReports', 'isStateActivity', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      }, { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.addColumn('CollabReportSteps', 'collabStepId', {
        type: Sequelize.INTEGER,
        allowNull: false,
      }, { transaction });

      await queryInterface.addColumn('CollabReportSteps', 'collabStepPriority', {
        type: Sequelize.SMALLINT,
        allowNull: false,
      }, { transaction });

      await queryInterface.changeColumn('CollabReports', 'isStateActivity', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      }, { transaction });
    });
  },
};
