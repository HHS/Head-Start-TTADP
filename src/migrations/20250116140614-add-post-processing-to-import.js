const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Run a query to determine if the column postProcessingActions exists in the table Imports.
      const [results] = await queryInterface.sequelize.query(/* sql */`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'Imports'
            AND column_name = 'postProcessingActions';
        `, { transaction });

      // If the column postProcessingActions exists in the table Imports, then return.
      if (results.length > 0) {
        return;
      }

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

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.removeColumn('Imports', 'postProcessingActions', { transaction });
    });
  },
};
