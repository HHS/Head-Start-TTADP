const { prepMigration, removeTables } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // the new values aren't used until after this transaction commits, so they can be added here
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_TtaRequests_status" ADD VALUE IF NOT EXISTS 'awaiting_approval';`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_TtaRequestNotes_action" ADD VALUE IF NOT EXISTS 'sent_for_approval';`,
        { transaction }
      );

      // the staff the reviewer assigns to a request
      await queryInterface.createTable(
        'TtaRequestAssignedStaff',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          ttaRequestId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: { tableName: 'TtaRequests' }, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: { tableName: 'Users' }, key: 'id' },
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('TtaRequestAssignedStaff', ['ttaRequestId', 'userId'], {
        name: 'tta_request_assigned_staff_tta_request_id_user_id',
        unique: true,
        transaction,
      });
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await removeTables(queryInterface, transaction, ['TtaRequestAssignedStaff']);

      // Postgres can't drop an enum value, so rebuild the types without the new ones. A request
      // awaiting approval goes back to being submitted, waiting on its reviewer, and the review
      // and approving COR that sent it along go with it.
      const statements = [
        `DELETE FROM "TtaRequestNotes" WHERE "action" = 'sent_for_approval';`,
        `DELETE FROM "TtaRequestApprovers" WHERE "step" = 'approver';`,
        `UPDATE "TtaRequestApprovers" SET "status" = NULL
          WHERE "step" = 'reviewer' AND "status" = 'approved';`,
        `ALTER TYPE "enum_TtaRequestNotes_action" RENAME TO "enum_TtaRequestNotes_action_old";`,
        `CREATE TYPE "enum_TtaRequestNotes_action" AS ENUM ('submitted', 'needs_action');`,
        `ALTER TABLE "TtaRequestNotes"
          ALTER COLUMN "action" TYPE "enum_TtaRequestNotes_action"
          USING "action"::text::"enum_TtaRequestNotes_action";`,
        `DROP TYPE "enum_TtaRequestNotes_action_old";`,
        `UPDATE "TtaRequests" SET "status" = 'submitted' WHERE "status" = 'awaiting_approval';`,
        `ALTER TABLE "TtaRequests" ALTER COLUMN "status" DROP DEFAULT;`,
        `ALTER TYPE "enum_TtaRequests_status" RENAME TO "enum_TtaRequests_status_old";`,
        `CREATE TYPE "enum_TtaRequests_status" AS ENUM ('draft', 'submitted', 'needs_action');`,
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
