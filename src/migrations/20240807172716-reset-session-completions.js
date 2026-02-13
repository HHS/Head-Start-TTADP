const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.sequelize.query(
        /* sql */ `
        -- Four sessions are not editable because they have already been
        -- marked complete by POC. A support request has asked us to
        -- revert this completion status so that they can be edited.

        -- To do this, we set:

        -- * pocComplete to false
        -- * pocCompleteId to ""
        -- * pocCompleteDate to ""

        -- ...on both the event and the session

        UPDATE "EventReportPilots"
        SET data = jsonb_set(jsonb_set(jsonb_set(data, '{pocComplete}', 'false'), '{pocCompleteId}', '""'), '{pocCompleteDate}', '""')
        WHERE id = 39;

        UPDATE "SessionReportPilots"
        SET data = jsonb_set(
            jsonb_set(
                jsonb_set(data, '{pocCompleteId}', '""'),
                '{pocCompleteDate}', '""'
            ),
            '{event, data, pocComplete}', 'false'
        )
        WHERE data ->> 'id' IN ('74', '101', '92', '102');
        `,
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      // If we end up needing to revert this, it would be easier to use a separate
      // migration using the txid (or a similar identifier) after it's already set
    }),
}
