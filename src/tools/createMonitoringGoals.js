import {
  sequelize,
  GoalTemplate,
  Goal,
} from '../models';
import { auditLogger } from '../logger';
import { changeGoalStatusWithSystemUser } from '../goalServices/changeGoalStatus';

const createMonitoringGoals = async () => {
  try {
    const cutOffDate = '2025-01-21';
    // Verify that the monitoring goal template exists.
    const monitoringGoalTemplate = await GoalTemplate.findOne({
      where: {
        standard: 'Monitoring',
      },
    });

    // If the monitoring goal template does not exist, throw an error.
    if (!monitoringGoalTemplate) {
      auditLogger.error('Monitoring Goal template not found');
      return;
    }

    // 1. Create monitoring goals for grants that need them.
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(`
      WITH
      grants_needing_goal AS (
        SELECT
          grta."activeGrantId" "grantId"
        FROM "Grants" gr
        JOIN "GrantRelationshipToActive" grta
        ON gr.id = grta."grantId"
        AND grta."activeGrantId" IS NOT NULL
        JOIN "MonitoringReviewGrantees" mrg
        ON gr.number = mrg."grantNumber"
        JOIN "MonitoringReviews" mr
        ON mrg."reviewId" = mr."reviewId"
        JOIN "MonitoringReviewStatuses" mrs
        ON mr."statusId" = mrs."statusId"
        JOIN "MonitoringFindingHistories" mfh
        ON mr."reviewId" = mfh."reviewId"
        JOIN "MonitoringFindings" mf
        ON mfh."findingId" = mf."findingId"
        JOIN "MonitoringFindingStatuses" mfs
        ON mf."statusId" = mfs."statusId"
        JOIN "MonitoringFindingGrants" mfg
        ON mf."findingId" = mfg."findingId"
        AND mrg."granteeId" = mfg."granteeId"
        LEFT JOIN "Goals" g
        ON (grta."grantId" = g."grantId"
        OR grta."activeGrantId" = g."grantId")
        AND g."goalTemplateId" = ${monitoringGoalTemplate.id}
        JOIN "Grants" gr2
        ON grta."activeGrantId" = gr2.id
        AND gr."recipientId" = gr2."recipientId"
        WHERE NOT gr2.cdi
        AND mrs."name" = 'Complete'
        AND mfs."name" = 'Active'
        AND mr."reportDeliveryDate" BETWEEN '${cutOffDate}' AND NOW()
        AND mr."reviewType" IN (
          'AIAN-DEF',
          'RAN',
          'Follow-up',
          'FA-1', 'FA1-FR',
          'FA-2', 'FA2-CR',
          'Special'
        )
        AND g.id IS NULL
        GROUP BY 1
      ),
      new_goals AS (
        SELECT
          gt."templateName" "name",
          'Not Started' "status",
          NULL "timeframe",
          FALSE "isFromSmartsheetTtaPlan",
          NOW() "createdAt",
          NOW() "updatedAt",
          gt.id "goalTemplateId",
          gng."grantId" "grantId",
          FALSE "onApprovedAR",
         'monitoring'::"enum_Goals_createdVia" "createdVia",
          'Yes'::"enum_Goals_isRttapa" "isRttapa",
          FALSE "onAR",
          'Federal monitoring issues, including CLASS and RANs'::"enum_Goals_source" "source"
        FROM "GoalTemplates" gt
        CROSS JOIN grants_needing_goal gng
        WHERE gt.id = ${monitoringGoalTemplate.id}
      )
      INSERT INTO "Goals"
      ("name", "status", "timeframe", "isFromSmartsheetTtaPlan", "createdAt", "updatedAt", "goalTemplateId", "grantId", "onApprovedAR", "createdVia", "isRttapa", "onAR", "source")
      SELECT
        "name", "status", "timeframe", "isFromSmartsheetTtaPlan", "createdAt", "updatedAt", "goalTemplateId", "grantId", "onApprovedAR", "createdVia", "isRttapa", "onAR", "source"
      FROM new_goals;
    `, { transaction });

      // 2. Reopen monitoring goals for grants that need them.
      const goalsToOpen = await sequelize.query(`
      WITH
        grants_needing_goal_reopend AS (
          SELECT
            g.id AS "goalId"
          FROM "Grants" gr
          JOIN "GrantRelationshipToActive" grta
            ON gr.id = grta."grantId"
            AND grta."activeGrantId" IS NOT NULL
          JOIN "MonitoringReviewGrantees" mrg
            ON gr.number = mrg."grantNumber"
          JOIN "MonitoringReviews" mr
            ON mrg."reviewId" = mr."reviewId"
          JOIN "MonitoringReviewStatuses" mrs
            ON mr."statusId" = mrs."statusId"
          JOIN "MonitoringFindingHistories" mfh
            ON mr."reviewId" = mfh."reviewId"
          JOIN "MonitoringFindings" mf
            ON mfh."findingId" = mf."findingId"
          JOIN "MonitoringFindingStatuses" mfs
            ON mf."statusId" = mfs."statusId"
          JOIN "MonitoringFindingGrants" mfg
            ON mf."findingId" = mfg."findingId"
            AND mrg."granteeId" = mfg."granteeId"
          LEFT JOIN "Goals" g
            ON (grta."grantId" = g."grantId"
            OR grta."activeGrantId" = g."grantId")
            AND g."goalTemplateId" = ${monitoringGoalTemplate.id}
          JOIN "Grants" gr2
            ON grta."activeGrantId" = gr2.id
            AND gr."recipientId" = gr2."recipientId"
          WHERE NOT gr2.cdi
            AND mrs."name" = 'Complete'
            AND mfs."name" = 'Active'
            AND mr."reportDeliveryDate" BETWEEN '${cutOffDate}' AND NOW()
            AND mr."reviewType" IN (
              'AIAN-DEF',
              'RAN',
              'Follow-up',
              'FA-1', 'FA1-FR',
              'FA-2', 'FA2-CR',
              'Special'
            )
            AND g.status IN ('Closed', 'Suspended')
            AND g."createdVia" = 'monitoring'
          GROUP BY 1
        )
      SELECT "goalId"
      FROM grants_needing_goal_reopend;
    `, { transaction });

      // Set reopened goals via Sequelize so we ensure the hooks fire.
      if (goalsToOpen[0].length > 0) {
        const goalsToOpenIds = goalsToOpen[0].map((goal) => goal.goalId);
        // This function also updates the status of the goal via the hook.
        // No need to explicitly update the goal status.
        await Promise.all(goalsToOpen[0].map((goal) => changeGoalStatusWithSystemUser({
          goalId: goal.goalId,
          newStatus: 'Not Started',
          reason: 'Active monitoring citations',
          context: null,
        })));
      }

      // 3. Close monitoring goals that no longer have any active citations and un-approved reports.
      const goalsToClose = await sequelize.query(`
      WITH
    grants_with_monitoring_goal AS (
      SELECT
        gr.id "grantId",
        gr.number,
        g.id "goalId"
      FROM "GoalTemplates" gt
      JOIN "Goals" g
      ON gt.id = g."goalTemplateId"
      JOIN "Grants" gr
      ON g."grantId" = gr.id
      WHERE gt.standard = 'Monitoring'
      AND g.status != 'Closed'
      AND g."createdVia" = 'monitoring'
    ),
    with_no_active_reports AS (
      SELECT
        gwmg."grantId",
        gwmg.number,
        gwmg."goalId"
      FROM grants_with_monitoring_goal gwmg
      LEFT JOIN "ActivityReportGoals" arg
      ON gwmg."goalId" = arg."goalId"
      LEFT JOIN "ActivityReports" a
      ON arg."activityReportId" = a.id
      AND a."calculatedStatus" NOT IN ('deleted', 'approved')
      WHERE a.id IS NULL
    ),
    with_active_citations AS (
      SELECT
        wnar."grantId",
        wnar.number,
        wnar."goalId"
      FROM with_no_active_reports wnar
      JOIN "GrantRelationshipToActive" grta
      ON wnar."grantId" = grta."grantId"
      OR wnar."grantId" = grta."activeGrantId"
      JOIN "Grants" gr
      ON grta."grantId" = gr.id
      JOIN "MonitoringReviewGrantees" mrg
      ON gr.number = mrg."grantNumber"
      JOIN "MonitoringReviews" mr
      ON mrg."reviewId" = mr."reviewId"
      AND mr."reportDeliveryDate" BETWEEN '${cutOffDate}' AND NOW()
      JOIN "MonitoringReviewStatuses" mrs
      ON mr."statusId" = mrs."statusId"
      AND mrs.name = 'Complete'
      JOIN "MonitoringFindingHistories" mfh
      ON mr."reviewId" = mfh."reviewId"
      JOIN "MonitoringFindings" mf
      ON mfh."findingId" = mf."findingId"
      JOIN "MonitoringFindingStatuses" mfs
      ON mf."statusId" = mfs."statusId"
      AND mfs.name = 'Active'
      JOIN "MonitoringFindingGrants" mfg
      ON mf."findingId" = mfg."findingId"
      AND mrg."granteeId" = mfg."granteeId"
    ),
    -- Because findings can have multiple reviews as different states.
    -- It's better to first get everything that is still active and do a NOT EXISTS IN.
    without_active_citations_and_reports AS (
      SELECT
        wnar."grantId",
        wnar.number,
        wnar."goalId"
      FROM with_no_active_reports wnar
      EXCEPT
      SELECT
        wac."grantId",
        wac.number,
        wac."goalId"
      FROM with_active_citations wac
    )
      SELECT "goalId"
      FROM without_active_citations_and_reports;
    `, { transaction });

      // Set closed goals via Sequelize so we ensure the hooks fire.
      if (goalsToClose[0].length > 0) {
        const goalsToCloseIds = goalsToClose[0].map((goal) => goal.goalId);
        // This function also updates the status of the goal via the hook.
        // No need to explicitly update the goal status.
        await Promise.all(goalsToClose[0].map((goal) => changeGoalStatusWithSystemUser({
          goalId: goal.goalId,
          newStatus: 'Closed',
          reason: 'No active monitoring citations',
          context: null,
        })));
      }
    });
  } catch (error) {
    console.log(`Error creating monitoring: ${error.message} | Stack Trace: ${error.stack}`);
    auditLogger.error(`Error creating monitoring: ${error.message} | Stack Trace: ${error.stack}`);
  }
};

export default createMonitoringGoals;
