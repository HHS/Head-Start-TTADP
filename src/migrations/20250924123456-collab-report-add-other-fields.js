const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.addColumn('CollabReports', 'otherParticipants', {
        allowNull: true,
        type: Sequelize.TEXT,
      }, { transaction });

      await queryInterface.addColumn('CollabReports', 'otherDataUsed', {
        allowNull: true,
        type: Sequelize.TEXT,
      }, { transaction });

      await queryInterface.addColumn('CollabReports', 'hasDataUsed', {
        allowNull: true,
        type: Sequelize.BOOLEAN,
      }, { transaction });

      await queryInterface.addColumn('CollabReports', 'hasGoals', {
        allowNull: true,
        type: Sequelize.BOOLEAN,
      }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeColumn('CollabReports', 'otherParticipants', { transaction });
      await queryInterface.removeColumn('CollabReports', 'otherDataUsed', { transaction });
      await queryInterface.removeColumn('CollabReports', 'hasDataUsed', { transaction });
      await queryInterface.removeColumn('CollabReports', 'hasGoals', { transaction });
    });
  },
};
