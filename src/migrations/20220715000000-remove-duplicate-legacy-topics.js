module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      try {
        const loggedUser = '0';
        // const transactionId = '';
        const sessionSig = __filename;
        const auditDescriptor = 'RUN MIGRATIONS';
        await queryInterface.sequelize.query(
          `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "TempLegacyTopics" AS
            SELECT
              ti.id "topicId",
              tv."mapsTo"
            FROM "Topics" tv
            JOIN "Topics" ti
            ON tv.name = ti.name
            AND tv."deletedAt" IS NOT NULL
            AND ti."deletedAt" IS NULL
            AND ti."createdAt" > '2022-07-13';
            ------------------------------------------------------------------------------------
            UPDATE "ObjectiveTopics" ot
            SET
              "topicId" = tlt."mapsTo"
            FROM "TempLegacyTopics" tlt
            WHERE ot."topicId" = tlt."topicId"
            AND tlt."mapsTo" IS NOT NULL;
            ------------------------------------------------------------------------------------
            DELETE FROM "ObjectiveTopics" ot
            USING "TempLegacyTopics" tlt
            WHERE ot."topicId" = tlt."topicId"
            AND tlt."mapsTo" IS NULL;
            ------------------------------------------------------------------------------------
            UPDATE "ObjectiveTemplateTopics" ott
            SET
              "topicId" = tlt."mapsTo"
            FROM "TempLegacyTopics" tlt
            WHERE ott."topicId" = tlt."topicId"
            AND tlt."mapsTo" IS NOT NULL;
            ------------------------------------------------------------------------------------
            DELETE FROM "ObjectiveTemplateTopics" ott
            USING "TempLegacyTopics" tlt
            WHERE ott."topicId" = tlt."topicId"
            AND tlt."mapsTo" IS NULL;
            ------------------------------------------------------------------------------------
            DELETE FROM "Topics" t
            USING "TempLegacyTopics" tlt
            WHERE t."id" = tlt."topicId";
            ------------------------------------------------------------------------------------
            DROP TABLE "TempLegacyTopics";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  down: async () => {},
};
