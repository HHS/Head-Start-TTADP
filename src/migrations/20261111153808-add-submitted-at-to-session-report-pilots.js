const { prepMigration } = require('../lib/migration');

// When a session was last submitted or resubmitted for approval; read by the TR-21 digest
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.addColumn(
        'SessionReportPilots',
        'submittedAt',
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );
    });
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeColumn('SessionReportPilots', 'submittedAt', { transaction });
    });
  },
};
