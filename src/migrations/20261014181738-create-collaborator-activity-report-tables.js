const { prepMigration, removeTables } = require('../lib/migration');

// Each link table records which activity reports a goal/objective collaborator is linked
// through, replacing the `linkBack.activityReportIds` JSONB array on the collaborator row.
const LINK_TABLES = [
  {
    table: 'GoalCollaboratorActivityReports',
    collaboratorTable: 'GoalCollaborators',
    collaboratorIdColumn: 'goalCollaboratorId',
    uniqueIndex: 'goal_collaborator_activity_reports_unique',
    reportIndex: 'goal_collaborator_activity_reports_report_id',
  },
  {
    table: 'ObjectiveCollaboratorActivityReports',
    collaboratorTable: 'ObjectiveCollaborators',
    collaboratorIdColumn: 'objectiveCollaboratorId',
    uniqueIndex: 'objective_collaborator_activity_reports_unique',
    reportIndex: 'objective_collaborator_activity_reports_report_id',
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // eslint-disable-next-line no-restricted-syntax
      for (const {
        table,
        collaboratorTable,
        collaboratorIdColumn,
        uniqueIndex,
        reportIndex,
      } of LINK_TABLES) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.createTable(
          table,
          {
            id: {
              type: Sequelize.INTEGER,
              autoIncrement: true,
              primaryKey: true,
            },
            [collaboratorIdColumn]: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: { model: { tableName: collaboratorTable }, key: 'id' },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            activityReportId: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: { model: { tableName: 'ActivityReports' }, key: 'id' },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn('NOW'),
            },
            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn('NOW'),
            },
          },
          { transaction }
        );

        // Copy the report ids out of the JSONB array for active collaborators. Only numeric ids
        // that still match an existing report are copied, so the foreign key holds. The CASEs
        // guard the array expansion and the int cast themselves, because Postgres doesn't
        // promise to apply WHERE filters first: malformed legacy data (a non-array, "abc", an id
        // too large for an int) is skipped instead of aborting the migration.
        // The "linkBack" column itself is intentionally left untouched.
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.sequelize.query(
          /* sql */ `
          INSERT INTO "${table}" ("${collaboratorIdColumn}", "activityReportId", "createdAt", "updatedAt")
          SELECT DISTINCT ids.collaborator_id, ids.report_id, NOW(), NOW()
          FROM (
            SELECT
              c.id AS collaborator_id,
              CASE WHEN raw_id ~ '^[0-9]{1,9}$' THEN raw_id::int END AS report_id
            FROM "${collaboratorTable}" c
            CROSS JOIN LATERAL jsonb_array_elements_text(
              CASE
                WHEN jsonb_typeof(c."linkBack"->'activityReportIds') = 'array'
                THEN c."linkBack"->'activityReportIds'
                ELSE '[]'::jsonb
              END
            ) AS raw_id
            WHERE c."deletedAt" IS NULL
          ) ids
          JOIN "ActivityReports" ar ON ar.id = ids.report_id;
        `,
          { transaction }
        );

        // Built after the backfill so the bulk insert doesn't maintain them row by row.
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.sequelize.query(
          /* sql */ `
          CREATE UNIQUE INDEX "${uniqueIndex}"
            ON "${table}" ("${collaboratorIdColumn}", "activityReportId");
          CREATE INDEX "${reportIndex}"
            ON "${table}" ("activityReportId");
        `,
          { transaction }
        );
      }
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // Once deployed, links are only written to the new tables, so copy them back into
      // "linkBack" before dropping the tables; otherwise links made since deploy would be lost.
      // eslint-disable-next-line no-restricted-syntax
      for (const { table, collaboratorTable, collaboratorIdColumn } of LINK_TABLES) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.sequelize.query(
          /* sql */ `
          UPDATE "${collaboratorTable}" c
          SET "linkBack" = jsonb_set(COALESCE(c."linkBack", '{}'::jsonb), '{activityReportIds}', links.ids)
          FROM (
            SELECT "${collaboratorIdColumn}" AS collaborator_id,
              jsonb_agg(DISTINCT "activityReportId" ORDER BY "activityReportId") AS ids
            FROM "${table}"
            GROUP BY "${collaboratorIdColumn}"
          ) links
          WHERE c.id = links.collaborator_id;
        `,
          { transaction }
        );
      }

      await removeTables(
        queryInterface,
        transaction,
        LINK_TABLES.map(({ table }) => table)
      );
    }),
};
