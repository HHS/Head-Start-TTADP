const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`
        -- First, set it at the event level.
        UPDATE "EventReportPilots"
        SET data = jsonb_set(jsonb_set(jsonb_set(data, '{pocComplete}', 'false'), '{pocCompleteId}', '""'), '{pocCompleteDate}', '""')
        WHERE id = 39;

        -- Then, set it at the session level
        UPDATE "SessionReportPilots"
        SET data = jsonb_set(
            jsonb_set(
                jsonb_set(data, '{pocCompleteId}', '""'),
                '{pocCompleteDate}', '""'
            ),
            '{event, data, pocComplete}', 'false'
        )
        WHERE data ->> 'id' IN ('74', '101', '92', '102');
        `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // If we end up needing to revert this, it would be easier to use a separate
      // migration using the txid (or a similar identifier) after it's already set
    },
  ),
};
