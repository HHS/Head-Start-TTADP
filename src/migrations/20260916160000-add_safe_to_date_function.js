const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // TO_DATE throws "date/time field value out of range" for values that are
      // shaped like a date but aren't calendar-valid (e.g. 02/30/2026, 13/01/2026).
      // safe_to_date wraps it so malformed values become NULL instead of crashing
      // whatever query calls it.
      await queryInterface.sequelize.query(
        `
        CREATE OR REPLACE FUNCTION safe_to_date(input text, fmt text)
        RETURNS date
        LANGUAGE plpgsql
        IMMUTABLE
        AS $BODY$
        BEGIN
          RETURN TO_DATE(input, fmt);
        EXCEPTION WHEN OTHERS THEN
          RETURN NULL;
        END;
        $BODY$;
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS safe_to_date(text, text);', {
        transaction,
      });
    });
  },
};
