const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      /* Goals */
      // Add new enum value (Can't use transaction here).
      await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_Goals_source" ADD VALUE 'Training event';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

      await queryInterface.sequelize.query(`
    DO $$ BEGIN
      ALTER TYPE "enum_Goals_source" ADD VALUE 'Training event follow-up';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

      // Update to new enum value.
      await queryInterface.sequelize.query(
        `UPDATE "Goals"
            SET "source" = 'Training event'::"enum_Goals_source"
          WHERE "source" = 'Training event follow-up'::"enum_Goals_source";`,
        { transaction },
      );

      // Remove enum value.
      await queryInterface.sequelize.query(
        `DELETE FROM pg_enum
            WHERE enumlabel = 'Training event follow-up'
              AND enumtypid = (
                SELECT oid
                FROM pg_type
                WHERE typname = 'enum_Goals_source'
              );`,
        { transaction },
      );

      /* ActivityReportGoals */
      // Add new enum value (Can't use transaction here).
      await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_ActivityReportGoals_source" ADD VALUE 'Training event';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

      await queryInterface.sequelize.query(`
    DO $$ BEGIN
      ALTER TYPE "enum_ActivityReportGoals_source" ADD VALUE 'Training event follow-up';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
      // Update to new enum value.
      await queryInterface.sequelize.query(
        `UPDATE "ActivityReportGoals"
            SET "source" = 'Training event'::"enum_ActivityReportGoals_source"
          WHERE "source" = 'Training event follow-up'::"enum_ActivityReportGoals_source";`,
        { transaction },
      );

      // Remove enum value.
      await queryInterface.sequelize.query(
        `DELETE FROM pg_enum
            WHERE enumlabel = 'Training event follow-up'
              AND enumtypid = (
                SELECT oid
                FROM pg_type
                WHERE typname = 'enum_ActivityReportGoals_source'
              );`,
        { transaction },
      );
    });
  },

  async down() {
    // no rollbacks
  },
};
