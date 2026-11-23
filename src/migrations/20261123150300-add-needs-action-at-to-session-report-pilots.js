const { prepMigration } = require('../lib/migration');

// When the Session Approver last requested changes to a session. Dates the TR-22 digest the
// same way `submittedAt` dates the TR-21 digest.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.addColumn(
        'SessionReportPilots',
        'needsActionAt',
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );
    }),

  down: (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.removeColumn('SessionReportPilots', 'needsActionAt', { transaction });
    }),
};
