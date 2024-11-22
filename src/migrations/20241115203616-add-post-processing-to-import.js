const { GROUP_SHARED_WITH } = require('@ttahub/common');
const {
  prepMigration,
  removeTables,
} = require('../lib/migration');
const { GROUP_COLLABORATORS } = require('../constants');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Add column postProcessingActions to table Imports of JSONB type.
      await queryInterface.addColumn(
        'Imports',
        'postProcessingActions',
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction },
      );

      // Update Imports set the postProcessingActions column to the object.
      await queryInterface.sequelize.query(/* sql */`
            UPDATE "Imports"
            SET "postProcessingActions" = '[{"name": "Monitoring Goal CRON job", "function": "createMonitoringGoals"}]'
            WHERE "name" = 'ITAMS Monitoring Data';
        `, { transaction });
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.removeColumn('Imports', 'postProcessingActions', { transaction });
    });
  },
};
