const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        `
        UPDATE "ActivityReportObjectiveCitations"
        SET
          "findingSource" = NULLIF(BTRIM("findingSource"), ''),
          name = CONCAT_WS(
            ' - ',
            NULLIF(BTRIM(acro), ''),
            NULLIF(BTRIM(citation), ''),
            NULLIF(BTRIM("findingSource"), '')
          )
        WHERE
          COALESCE(name, '') <> CONCAT_WS(
              ' - ',
              NULLIF(BTRIM(acro), ''),
              NULLIF(BTRIM(citation), ''),
              NULLIF(BTRIM("findingSource"), '')
            )
          OR COALESCE("findingSource", '') <> COALESCE(NULLIF(BTRIM("findingSource"), ''), '');
        `,
        { transaction }
      );
    });
  },

  async down() {
    // no rollback — repaired names are deterministic and safe to retain
  },
};
