const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.sequelize.query(
        /* sql */ `

        -- One very old session lacks the regionId value
        -- This finds and sets it
        DROP TABLE IF EXISTS sr_updates;
        CREATE TEMP TABLE sr_updates
        AS
        WITH updater AS (
        UPDATE "SessionReportPilots" srp
        SET data = JSONB_SET(srp.data,'{regionId}',TO_JSONB(erp."regionId"))
        FROM "EventReportPilots" erp
        WHERE erp.id = srp."eventId"
          AND srp.data->>'regionId' = ''
        RETURNING
          srp.id srpid,
          erp."regionId"
        ) SELECT * FROM updater
        ;

        SELECT * FROM sr_updates;
        -- Looks like:
        ----------------------
        --  srpid | regionId
        -- -------+----------
        --      2 |        3
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
