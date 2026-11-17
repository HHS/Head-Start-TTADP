const { prepMigration, removeTables } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // the new values aren't used until after this transaction commits, so they can be added here
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_TtaRequests_status" ADD VALUE IF NOT EXISTS 'approved';`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_TtaRequestNotes_action" ADD VALUE IF NOT EXISTS 'approved';`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Goals_createdVia" ADD VALUE IF NOT EXISTS 'ttaRequest';`,
        { transaction }
      );

      // when the COR approved the request, which the approved requests table lists them by
      await queryInterface.addColumn(
        'TtaRequests',
        'approvedAt',
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );

      // the goals a request created, or reused, when its COR approved it; one per grant
      await queryInterface.createTable(
        'TtaRequestGoals',
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
          goalId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: { tableName: 'Goals' }, key: 'id' },
            onUpdate: 'CASCADE',
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

      await queryInterface.addIndex('TtaRequestGoals', ['ttaRequestId', 'goalId'], {
        name: 'tta_request_goals_tta_request_id_goal_id',
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('TtaRequestGoals', ['goalId'], {
        name: 'tta_request_goals_goal_id',
        transaction,
      });
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await removeTables(queryInterface, transaction, ['TtaRequestGoals']);
      await queryInterface.removeColumn('TtaRequests', 'approvedAt', { transaction });

      // Postgres can't drop an enum value, so rebuild the request types without the new ones. An
      // approved request goes back to awaiting its COR, and the approval goes with it. The goals
      // it created are left in place, and like earlier createdVia additions, 'ttaRequest' stays
      // on the goals enum since rebuilding the type of Goals isn't worth the risk.
      const statements = [
        `DELETE FROM "TtaRequestNotes" WHERE "action" = 'approved';`,
        `ALTER TYPE "enum_TtaRequestNotes_action" RENAME TO "enum_TtaRequestNotes_action_old";`,
        `CREATE TYPE "enum_TtaRequestNotes_action"
          AS ENUM ('submitted', 'needs_action', 'sent_for_approval');`,
        `ALTER TABLE "TtaRequestNotes"
          ALTER COLUMN "action" TYPE "enum_TtaRequestNotes_action"
          USING "action"::text::"enum_TtaRequestNotes_action";`,
        `DROP TYPE "enum_TtaRequestNotes_action_old";`,
        `UPDATE "TtaRequestApprovers" SET "status" = NULL
          WHERE "status" = 'approved'
          AND "ttaRequestId" IN (SELECT id FROM "TtaRequests" WHERE "status" = 'approved');`,
        `UPDATE "TtaRequests" SET "status" = 'awaiting_approval' WHERE "status" = 'approved';`,
        `ALTER TABLE "TtaRequests" ALTER COLUMN "status" DROP DEFAULT;`,
        `ALTER TYPE "enum_TtaRequests_status" RENAME TO "enum_TtaRequests_status_old";`,
        `CREATE TYPE "enum_TtaRequests_status"
          AS ENUM ('draft', 'submitted', 'needs_action', 'awaiting_approval');`,
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
