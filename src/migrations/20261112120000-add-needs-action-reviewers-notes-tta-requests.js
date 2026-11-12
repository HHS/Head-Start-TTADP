const { prepMigration, removeTables } = require('../lib/migration');

const REVIEWER_STATUSES = ['needs_action', 'approved'];
const NOTE_STEPS = ['creator', 'reviewer', 'approver'];
const NOTE_ACTIONS = ['submitted', 'needs_action'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // the new value isn't used until after this transaction commits, so it can be added here
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_TtaRequests_status" ADD VALUE IF NOT EXISTS 'needs_action';`,
        { transaction }
      );

      // the reviewer a request was submitted to, and where they stand; a null status is pending
      await queryInterface.createTable(
        'TtaRequestReviewers',
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
          status: {
            type: Sequelize.ENUM(REVIEWER_STATUSES),
            allowNull: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('TtaRequestReviewers', ['ttaRequestId', 'userId'], {
        name: 'tta_request_reviewers_tta_request_id_user_id',
        unique: true,
        transaction,
      });

      // every submission and review, in the order they happened; rows are only ever added
      await queryInterface.createTable(
        'TtaRequestNotes',
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
          step: {
            type: Sequelize.ENUM(NOTE_STEPS),
            allowNull: false,
          },
          action: {
            type: Sequelize.ENUM(NOTE_ACTIONS),
            allowNull: false,
          },
          note: {
            type: Sequelize.TEXT,
            allowNull: true,
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

      await queryInterface.addIndex('TtaRequestNotes', ['ttaRequestId', 'createdAt'], {
        name: 'tta_request_notes_tta_request_id_created_at',
        transaction,
      });

      // requests already submitted have a pending reviewer and the creator's submission
      const statements = [
        `INSERT INTO "TtaRequestReviewers" ("ttaRequestId", "userId", "status", "createdAt", "updatedAt")
          SELECT "id", "reviewerId", NULL, "submittedAt", "submittedAt"
          FROM "TtaRequests"
          WHERE "status" = 'submitted' AND "reviewerId" IS NOT NULL AND "deletedAt" IS NULL;`,
        `INSERT INTO "TtaRequestNotes" ("ttaRequestId", "userId", "step", "action", "note", "createdAt", "updatedAt")
          SELECT "id", "userId", 'creator', 'submitted', "creatorNotes",
            COALESCE("submittedAt", "updatedAt"), COALESCE("submittedAt", "updatedAt")
          FROM "TtaRequests"
          WHERE "status" = 'submitted' AND "deletedAt" IS NULL;`,
        // the notes now live in the history, and the field is blank for the next submission
        `UPDATE "TtaRequests" SET "creatorNotes" = NULL
          WHERE "status" = 'submitted' AND "deletedAt" IS NULL;`,
      ];

      for (const statement of statements) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.sequelize.query(statement, { transaction });
      }
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // One statement per query; pg won't run several in one prepared statement.
      const statements = [
        // put back the creator's latest submitted note, as the request held it before
        `UPDATE "TtaRequests" r SET "creatorNotes" = n."note"
          FROM (
            SELECT DISTINCT ON ("ttaRequestId") "ttaRequestId", "note"
            FROM "TtaRequestNotes"
            WHERE "step" = 'creator' AND "action" = 'submitted'
            ORDER BY "ttaRequestId", "createdAt" DESC, "id" DESC
          ) n
          WHERE r."id" = n."ttaRequestId" AND r."creatorNotes" IS NULL;`,
      ];

      for (const statement of statements) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.sequelize.query(statement, { transaction });
      }

      await removeTables(queryInterface, transaction, ['TtaRequestReviewers', 'TtaRequestNotes']);

      // Postgres can't drop an enum value, so rebuild the type without 'needs_action'.
      const enumStatements = [
        `DROP TYPE IF EXISTS "enum_TtaRequestReviewers_status";`,
        `DROP TYPE IF EXISTS "enum_TtaRequestNotes_step";`,
        `DROP TYPE IF EXISTS "enum_TtaRequestNotes_action";`,
        `UPDATE "TtaRequests" SET "status" = 'submitted' WHERE "status" = 'needs_action';`,
        `ALTER TABLE "TtaRequests" ALTER COLUMN "status" DROP DEFAULT;`,
        `ALTER TYPE "enum_TtaRequests_status" RENAME TO "enum_TtaRequests_status_old";`,
        `CREATE TYPE "enum_TtaRequests_status" AS ENUM ('draft', 'submitted');`,
        `ALTER TABLE "TtaRequests"
          ALTER COLUMN "status" TYPE "enum_TtaRequests_status"
          USING "status"::text::"enum_TtaRequests_status";`,
        `ALTER TABLE "TtaRequests" ALTER COLUMN "status" SET DEFAULT 'draft';`,
        `DROP TYPE "enum_TtaRequests_status_old";`,
      ];

      for (const statement of enumStatements) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.sequelize.query(statement, { transaction });
      }
    }),
};
