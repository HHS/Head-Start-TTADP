const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // Move TR Event R10-PD-25-25038 from "Complete" back to "In progress"
      // so a user can add a new (May) session. Only the event is reset; its
      // existing sessions are intentionally left untouched. The status guard
      // makes this a safe no-op if the event has already been reset.
      await queryInterface.sequelize.query(
        /* sql */ `
        UPDATE "EventReportPilots"
        SET data = jsonb_set(data, '{status}', '"In progress"', true)
        WHERE data->>'eventId' = 'R10-PD-25-25038'
          AND data->>'status' = 'Complete';
        `,
        { transaction }
      );
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // No down migration; reversing this one-off data fix would be a separate migration.
    }),
};
