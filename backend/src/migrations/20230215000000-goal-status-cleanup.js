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
        // set status of draft for non-imported goals without a status.
        await queryInterface.sequelize.query(`
          WITH
            "GoalFixes" AS (
              select
                g.id,
                'Draft' "status"
              FROM "Goals" g
              LEFT JOIN "ActivityReportGoals" arg
              ON g.id = arg."goalId"
              LEFT JOIN "ActivityReports" a
              ON arg."activityReportId" = a.id
              WHERE NULLIF(g.status,'') IS NULL
              AND arg.id IS NULL
              AND g."createdVia" != 'imported'
              order by g.id
            )
          UPDATE "Goals" g
          SET "status" = gf."status"
          FROM "GoalFixes" gf
          WHERE g.id = gf.id;
          `, { transaction });

        // set status of not started for imported goals without a status.
        await queryInterface.sequelize.query(`
          WITH
            "GoalFixes" AS (
              select
                g.id,
                'Not Started' "status"
              FROM "Goals" g
              LEFT JOIN "ActivityReportGoals" arg
              ON g.id = arg."goalId"
              LEFT JOIN "ActivityReports" a
              ON arg."activityReportId" = a.id
              WHERE NULLIF(g.status,'') IS NULL
              AND arg.id IS NULL
              AND g."createdVia" = 'imported'
              order by g.id
            )
          UPDATE "Goals" g
          SET "status" = gf."status"
          FROM "GoalFixes" gf
          WHERE g.id = gf.id;
          `, { transaction });

        // copy the createdVia from goal this goal was cloned from
        await queryInterface.sequelize.query(`
          WITH
            "GoalFixes" AS (
              select
                g.id,
                (ARRAY_AGG(g2."createdVia"))[1] "createdVia"
              FROM "Goals" g
              LEFT JOIN "ActivityReportGoals" arg
              ON g.id = arg."goalId"
              LEFT JOIN "ActivityReports" a
              ON arg."activityReportId" = a.id
              LEFT JOIN "Goals" g2
              ON g."goalTemplateId" = g2."goalTemplateId"
              AND g2."createdVia" IS NOT NULL
              WHERE g."createdVia" IS NULL
              AND arg.id IS NOT NULL
              AND g2.id IS NOT NULL
              group by 1
              order by g.id
            )
          UPDATE "Goals" g
          SET "createdVia" = gf."createdVia"
          FROM "GoalFixes" gf
          WHERE g.id = gf.id;
          `, { transaction });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  // no structral changed to undo, once updates are made the record are unidentifiable from all
  // others, so a clearing of values set is not posable.
  down: () => {},
};
