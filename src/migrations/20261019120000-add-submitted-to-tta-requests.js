const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_TtaRequests_status" ADD VALUE IF NOT EXISTS 'submitted';`,
        { transaction }
      );

      await queryInterface.addColumn(
        'TtaRequests',
        'submittedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.removeColumn('TtaRequests', 'submittedAt', { transaction });

      // Postgres can't drop an enum value, so rebuild the type without 'submitted'.
      // One statement per query; pg won't run several in one prepared statement.
      const statements = [
        `UPDATE "TtaRequests" SET "status" = 'draft' WHERE "status" = 'submitted';`,
        `ALTER TABLE "TtaRequests" ALTER COLUMN "status" DROP DEFAULT;`,
        `ALTER TYPE "enum_TtaRequests_status" RENAME TO "enum_TtaRequests_status_old";`,
        `CREATE TYPE "enum_TtaRequests_status" AS ENUM ('draft');`,
        `ALTER TABLE "TtaRequests"
          ALTER COLUMN "status" TYPE "enum_TtaRequests_status"
          USING "status"::text::"enum_TtaRequests_status";`,
        `ALTER TABLE "TtaRequests" ALTER COLUMN "status" SET DEFAULT 'draft';`,
        `DROP TYPE "enum_TtaRequests_status_old";`,
      ];

      for (const statement of statements) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.sequelize.query(statement, { transaction });
      }
    }),
};
