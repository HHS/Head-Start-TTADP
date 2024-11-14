const { prepMigration } = require('../lib/migration');

const goalText = '(Monitoring) The recipient will develop and implement a QIP/CAP to address monitoring findings.';
module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // Add monitor goal template.
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF NOT EXISTS (
        SELECT 1 FROM "GoalTemplates"
        WHERE hash = MD5(TRIM('${goalText}'))
        AND "creationMethod" = 'Curated'::"enum_GoalTemplates_creationMethod"
          ) THEN
        INSERT INTO "GoalTemplates" (
          hash,
          "templateName",
          "regionId",
          "creationMethod",
          "createdAt",
          "updatedAt",
          "lastUsed",
          "templateNameModifiedAt"
        ) VALUES (
          MD5(TRIM('${goalText}')),
          '${goalText}',
          null,
          'Curated'::"enum_GoalTemplates_creationMethod",
          current_timestamp,
          current_timestamp,
          NULL,
          current_timestamp
        );
          END IF;
        END $$;`,
        { transaction },
      );
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(
        `DELETE FROM "GoalTemplates"
        WHERE hash = MD5(TRIM('${goalText}'))
        AND "creationMethod" = 'Curated'::"enum_GoalTemplates_creationMethod";
        `,
        { transaction },
      );
    },
  ),
};
