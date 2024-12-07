const { prepMigration } = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // Set Monitoring goal back to Curated for use in the system.
      await queryInterface.sequelize.query(/* sql */`
        UPDATE "GoalTemplates"
        SET "creationMethod" = 'Curated'
        WHERE "creationMethod" = 'System Generated';
        `, { transaction });

      // Add a standard column that we populate with whats in () in the template name when curated.
      await queryInterface.sequelize.query(/* sql */`
      ALTER TABLE "GoalTemplates"
      ADD COLUMN standard TEXT GENERATED ALWAYS AS (
        CASE
        WHEN "creationMethod" = 'Curated' THEN substring("templateName" from '(?:^[(]([^)]+)[)])')
        ELSE NULL
        END) STORED;
      `, { transaction });

      // Add a unique index on the standard column.
      await queryInterface.sequelize.query(/* sql */`
       CREATE UNIQUE INDEX unique_standard_non_null
        ON "GoalTemplates"(standard)
        WHERE standard IS NOT NULL;
    `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // Set creationMethod back to 'System Generated' for the monitoring goal template.
      await queryInterface.sequelize.query(/* sql */`
            UPDATE "GoalTemplates"
            SET "creationMethod" = 'System Generated'
            WHERE "standard" = 'Monitoring';
        `, { transaction });

      // Remove the unique index on the standard column.
      await queryInterface.sequelize.query(/* sql */`
                DROP INDEX unique_standard_non_null;
                `, { transaction });

      // Drop the standard column.
      await queryInterface.sequelize.query(/* sql */`
        ALTER TABLE "GoalTemplates"
        DROP COLUMN standard;
        `, { transaction });
    },
  ),
};
