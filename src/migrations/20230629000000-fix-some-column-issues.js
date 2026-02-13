module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'RUN MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
                set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
                set_config('audit.transactionId', NULL, TRUE) as "transactionId",
                set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
                set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )

      // Disable audit log
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
        `,
        { transaction }
      )

      const tables = await queryInterface.sequelize.query(
        `
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name like 'ZAL%'
        AND column_name = 'dml_as'
        AND is_nullable = 'YES'
        ORDER BY table_name, ordinal_position;
        `,
        { raw: true, transaction }
      )

      await Promise.all(
        tables[0].map(({ table_name }) =>
          queryInterface.sequelize.query(
            `
        UPDATE "${table_name}"
        SET dml_as = dml_by
        WHERE dml_as IS NULL;
        ALTER TABLE "${table_name}"
        ALTER COLUMN "dml_as" SET NOT NULL;
        `,
            {
              transaction,
            }
          )
        )
      )

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "ActivityReports"
        ALTER COLUMN "regionId" SET NOT NULL;
        ALTER TABLE "CollaboratorRoles"
        ALTER COLUMN "roleId" SET NOT NULL;
        ALTER TABLE "Groups"
        ALTER COLUMN "name" SET NOT NULL;
        ALTER TABLE "Recipients"
        ALTER COLUMN "name" SET NOT NULL;
        ALTER TABLE "UserValidationStatus"
        ALTER COLUMN "token" SET NOT NULL;
        `,
        {
          transaction,
        }
      )

      await queryInterface.sequelize.query(
        `
        ALTER TYPE "enum_GoalTemplateResources_sourceFields"
        RENAME TO "enum_GoalTemplateResources_sourceFields_OLD";

        CREATE TYPE "enum_GoalTemplateResources_sourceFields" AS ENUM (
          'name',
          'resource'
        );

        ALTER TABLE "GoalTemplateResources"
        RENAME COLUMN "sourceFields" TO "old_sourceFields";

        ALTER TABLE "GoalTemplateResources"
        ADD COLUMN "sourceFields" "enum_GoalTemplateResources_sourceFields"[];

        UPDATE "GoalTemplateResources"
        SET "sourceFields" = ARRAY(SELECT UNNEST("old_sourceFields")::TEXT::"enum_GoalTemplateResources_sourceFields");


        ALTER TABLE "GoalTemplateResources"
        DROP COLUMN "old_sourceFields";

        DROP TYPE IF EXISTS "enum_GoalTemplateResources_sourceFields_OLD"
        `,
        {
          transaction,
        }
      )

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "ActivityReportGoals"
        ALTER COLUMN "isActivelyEdited" SET DEFAULT false;
        ALTER TABLE "Goals"
        ALTER COLUMN "onApprovedAR" SET DEFAULT false;
        ALTER TABLE "Objectives"
        ALTER COLUMN "onApprovedAR" SET DEFAULT false;
        `,
        {
          transaction,
        }
      )

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "ActivityReports"
        ALTER COLUMN "version" SET DEFAULT 2;
        `,
        {
          transaction,
        }
      )

      // Disable audit log
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
        `,
        { transaction }
      )
    }),
}
