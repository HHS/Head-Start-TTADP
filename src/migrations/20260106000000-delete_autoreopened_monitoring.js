const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(/* sql */`
        ---------- The steps -------------------------------------------------
        -- 1: Collect all monitoring goals opened from Oct 2025 on, marking
        --    any that have TTA activity or which OHS tells us to keep.
        -- 2: Delete GoalStatus Changes related to unwanted goals
        -- 3: Soft-delete the Goals
        -- 4: Results comparison query
        ----------------------------------------------------------------------

        -- 1: Collect all monitoring goals opened from Oct 2025 on, marking
        --    any that have TTA activity or which OHS tells us to keep.
        DROP TABLE IF EXISTS mon_goals;
        CREATE TEMP TABLE mon_goals
        AS
        SELECT
          g.id gid,
          g."createdAt"::date create_date,
          gr."regionId" region,
          LEFT(r.name,25) recipient,
          g.id IN (-1) keep_request,
          BOOL_OR(ar.id IS NOT NULL) on_ar,
          BOOL_OR(ar.id IS NOT NULL AND ar."calculatedStatus" = 'approved') on_approved_ar,
          COUNT(DISTINCT gsc.id) gsc_cnt
        FROM "Goals" g
        JOIN "GoalTemplates" gt
          ON g."goalTemplateId" = gt.id
        JOIN "Grants" gr
          ON g."grantId" = gr.id
        JOIN "Recipients" r
          ON gr."recipientId" = r.id
        LEFT JOIN "ActivityReportGoals" arg
          ON g.id = arg."goalId"
        LEFT JOIN "ActivityReports" ar
          ON arg."activityReportId" = ar.id
          AND ar."calculatedStatus" != 'deleted'
        LEFT JOIN "GoalStatusChanges" gsc
          ON g.id = gsc."goalId"
        WHERE gt.standard = 'Monitoring'
          AND g."createdAt" > '2025-10-01'
        GROUP BY 1,2,3,4,5
        ORDER BY 1 DESC
        ;

        -- 2: Delete GoalStatus Changes related to unwanted goals
        DROP TABLE IF EXISTS deleted_gsc;
        CREATE TEMP TABLE deleted_gsc
        AS
        WITH updater AS (
        DELETE FROM "GoalStatusChanges" 
        USING mon_goals
        WHERE gid = "goalId"
          AND NOT keep_request
          AND NOT on_ar
        RETURNING
          gid,
          id gscid
        )
        SELECT
          gid gcd_gid,
          COUNT(DISTINCT gscid) del_gsc_cnt
        FROM updater
        GROUP BY 1
        ;

        -- 3: Soft-delete the Goals
        DROP TABLE IF EXISTS deleted_goals;
        CREATE TEMP TABLE deleted_goals
        AS
        WITH updater AS (
        DELETE FROM "Goals" 
        USING mon_goals
        WHERE gid = id
          AND NOT keep_request
          AND NOT on_ar
        RETURNING
          gid del_gid
        )
        SELECT * FROM updater
        ;
        -- 4: Results comparison query
        --    (for reviewers & etc)
        SELECT
          mg.*,
          CASE WHEN del_gid IS NOT NULL THEN 'deleted' ELSE 'kept' END fate,
          del_gsc_cnt gsc_deleted
        FROM mon_goals mg
        LEFT JOIN deleted_goals
          ON gid = del_gid
        LEFT JOIN deleted_gsc
          ON gid = gcd_gid
        ;
    `, { transaction });
    });
  },

  async down() {
    // no rollbacks of data fixes
  },
};
