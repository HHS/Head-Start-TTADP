const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.sequelize.query(`
        UPDATE "SessionReportPilots" SET data = data - 'event';
        UPDATE "EventReportPilots" SET data = data - 'sessionReports';
        UPDATE "SessionReportPilots"
        SET data = COALESCE(
          jsonb_set(
                data,
                '{recipients}',
                (
                    SELECT jsonb_agg(
                        (
                            elem
                            || jsonb_build_object(
                                'label', COALESCE(elem->>'label', elem->>'name'),
                                'value', COALESCE(elem->>'value', elem->>'activityRecipientId')::INT
                            )
                        ) - 'name' - 'activityRecipientId'
                    )
                    FROM jsonb_array_elements(data->'recipients') AS t(elem)
                ),
                false
            ),
          data
        )
        WHERE data ? 'recipients';
      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
