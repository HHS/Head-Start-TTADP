import { Op } from 'sequelize';
import {
  sequelize,
  GoalTemplate,
  Goal,
} from '../models';
import { auditLogger } from '../logger';

const createMonitoringGoals = async () => {
  // This section is here to temporarily disable monitoring goal creation
  // To re-enable, we can set ENABLE_MONITORING_GOALS_CREATION=true or just remove
  // this block if we don't think we'll ever use it again
  if (process.env.ENABLE_MONITORING_GOAL_CREATION !== 'true') {
    auditLogger.info('Monitoring goals creation is temporarily disabled');
    return;
  }

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
    let goals = [];
    await sequelize.transaction(async (transaction) => {
      [goals] = await sequelize.query(`
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

        AND g."deletedAt" IS NULL
        AND g.status != 'Closed'

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
      SELECT
        "name", "status", "timeframe", "isFromSmartsheetTtaPlan", "createdAt", "updatedAt", "goalTemplateId", "grantId", "onApprovedAR", "createdVia", "isRttapa", "onAR", "source"
      FROM new_goals;
    `, { transaction });

      // Bulk insert the goals returned from the above query using sequelize Goal.bulkCreate.
      // We need to do this to ensure we enter the Goal Status Change on create.
      auditLogger.info(`Creating ${goals.length} monitoring goals`);
      await Goal.bulkCreate(goals, {
        individualHooks: true,
        transaction,
        userId: null,
        ignoreHooks: ['autoPopulateCreator'], // Skip creator population for CLI scripts
      });
      // 3. Close monitoring goals that no longer have any active citations, un-approved reports,
      // or open Objectives
      /* Commenting out as temporarily not-needed (See [TTAHUB-4049](https://jira.acf.gov/browse/TTAHUB-4049))
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
    with_no_active_ars_or_objectives AS (
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
      LEFT JOIN "Objectives" o
      ON gwmg."goalId" = o."goalId"
      AND o.status NOT IN ('Complete','Suspended')
      AND o."deletedAt" IS NULL
      WHERE a.id IS NULL
      AND o.id IS NULL
    ),
    with_active_citations AS (
      SELECT
        wnar."grantId",
        wnar.number,
        wnar."goalId"
      FROM with_no_active_ars_or_objectives wnar
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
      AND mfs.name in ('Active', 'Elevated Deficiency')
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
      FROM with_no_active_ars_or_objectives wnar
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
      */

      // 4. Mark eligible AR-duped or RTR monitoring Goals so they can be used for follow-up TTA.
      //    This checks to make sure the unmarked monitoring goals are on grants that replace
      //    grants that already have properly marked Goals. This is intended to address cases
      //    where follow-up TTA is being performed beyond the initial review, which will usually
      //    be recorded on the currently active grant anyway.
      auditLogger.info('Marking monitoring goals for follow-up TTA eligibility');
      await sequelize.query(`
      WITH eligible_grants AS (
      SELECT DISTINCT
        gr."replacingGrantId" grid
      FROM "Goals" g
      JOIN "GoalTemplates" gt
        ON g."goalTemplateId" = gt.id
      JOIN "GrantReplacements" gr
        ON gr."replacedGrantId" = g."grantId"
      WHERE gt."creationMethod" = 'Curated'
        AND gt.standard = 'Monitoring'
        AND EXTRACT(DAY FROM NOW() - g."createdAt") < 365
      ),
      goals_to_update AS (
      SELECT DISTINCT
        g.id gid
      FROM eligible_grants eg
      JOIN "Goals" g
        ON g."grantId" = grid
      JOIN "GoalTemplates" gt
        ON g."goalTemplateId" = gt.id
      WHERE g."createdVia" IN ('rtr','activityReport')
        AND gt.standard = 'Monitoring'
      )
      UPDATE "Goals"
      SET "createdVia" = 'monitoring'
      FROM goals_to_update
      WHERE id = gid
      ;
    `, { transaction });
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Error creating monitoring: ${error.message} | Stack Trace: ${error.stack}`);
    auditLogger.error(`Error creating monitoring: ${error.message} | Stack Trace: ${error.stack}`);
    throw error;
  }
};

export default createMonitoringGoals;
