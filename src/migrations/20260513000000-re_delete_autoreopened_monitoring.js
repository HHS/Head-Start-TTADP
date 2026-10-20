const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(
        `
        -- This repeats 20260106000000-delete_autoreopened_monitoring because
        -- create_monitoring_goals ran before update_fact_tables in the pipeline,
        -- meaning the fact tables had not yet applied the corrected logic that
        -- avoids recreating the goals that the migration had just deleted.
        --
        -- So, we're re-running exactly the same logic:
        -- Identify open goals that are neither in use nor valid according to current logic:
        --   - created by the monitoring goal creation job
        --   - status is not Closed or Suspended
        --   - no non-deleted ARs associated with the Goal
        --   - has at least one Elevated Deficiency citation where:
        --     - its most recent review has a Compliant outcome
        --     - has no reviews still outstanding
        --   - has no active citations under current logic
        DROP TABLE IF EXISTS goals_for_deletion;
        CREATE TEMP TABLE goals_for_deletion
        AS
        WITH candidates AS (
        -- monitoring goal-citation pairs with:
        -- - no AR usage on the goal
        -- - the citation in the error case
        SELECT
          g.id gid,
          dr.outcome,
          g.status,
          gr.id grid,
          gr.number grnumber,
          r.name recipient,
          c.id cid
        FROM "Goals" g
        JOIN "Grants" gr
          ON g."grantId" = gr.id
        JOIN "Recipients" r
          ON gr."recipientId" = r.id
        JOIN "GrantCitations" gc
          ON gr.id = gc."grantId"
        JOIN "Citations" c
          ON gc."citationId" = c.id
          AND c."deletedAt" IS NULL
        JOIN "DeliveredReviews" dr
          ON c.latest_review_uuid = dr.review_uuid
          AND dr."deletedAt" IS NULL
        LEFT JOIN "ActivityReportGoals" arg
          ON arg."goalId" = g.id
        LEFT JOIN "ActivityReports" ar
          ON arg."activityReportId" = ar.id
          AND ar."calculatedStatus" != 'deleted'
        WHERE g."deletedAt" IS NULL
          AND g.status NOT IN ('Closed','Suspended')
          AND g."createdVia" = 'monitoring'
          AND last_review_delivered
          AND raw_status = 'Elevated Deficiency'
          AND outcome = 'Compliant'
        GROUP BY 1,2,3,4,5,6,7
        HAVING bool_and(ar.id IS NULL)
        )
        -- Rejoin from the grant to Citations to check if there
        -- are any active citations that are NOT the error case
        SELECT
          gid,
          grnumber,
          status,
          recipient
        FROM candidates
        JOIN "GrantCitations" gc
          ON grid = gc."grantId"
        JOIN "Citations" c
          ON gc."citationId" = c.id
        WHERE c."deletedAt" IS NULL
        GROUP BY 1,2,3,4
        HAVING NOT bool_or(c.active AND c.id != cid);

        -- Soft-delete the identified goals
        UPDATE "Goals"
        SET "deletedAt" = NOW()
        FROM goals_for_deletion
        WHERE id = gid;
    `,
        { transaction }
      );
    });
  },

  async down() {
    // no rollbacks of data fixes
  },
};
