import {
  sequelize,
  GoalTemplate,
} from '../models';
import { auditLogger } from '../logger';

const createMonitoringGoals = async () => {
  console.log('\n\n\n----- start of job');
  const cutOffDate = '2023-12-01';
  const monitoringGoalTemplateId = 18172;

  // Verify that the monitoring goal template exists.
  const monitoringGoalTemplate = await GoalTemplate.findOne({
    where: {
      id: monitoringGoalTemplateId,
    },
  });
  console.log('\n\n\n------monitoringGoalTemplate', monitoringGoalTemplate);

  // If the monitoring goal template does not exist, throw an error.
  if (!monitoringGoalTemplate) {
    auditLogger.error(`Monitoring Goal template with ID ${monitoringGoalTemplateId} not found`);
    return;
  }

  // Create monitoring goals for grants that need them.
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
      AND g."goalTemplateId" = ${monitoringGoalTemplateId} -- NEEDS TO BE CHANGED TO THE MONITORING GOAL
      WHERE gr.status = 'Active'
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
        'Not started' "status",
        NULL "timeframe",
        FALSE "isFromSmartSheetTtaPlan",
        NOW() "createdAt",
        NOW() "updatedAt",
        NULL "endDate",
        gt.id "goalTemplateId",
        gng."grantId" "grantId",
        FALSE "onApprovedAR",
        'monitoring' "createdVIA",
        FALSE "isRttapa",
        FALSE "onAR",
        NULL "rtrOrder",
        'Federal monitoring issues, including CLASS and RANs' "source",
        NULL "deletedAt",
        NULL "mapsToParrentGoalId"
      FROM "GoalTemplates" gt
      CROSS JOIN grants_needing_goal gng
      WHERE gt.id = 18172 -- NEEDS TO BE CHANGED TO THE MONITORING GOAL
    )
    INSERT INTO "Goals"
    ("name", "status", "timeframe", "isFromSmartSheetTtaPlan", "createdAt", "updatedAt", "endDate", "goalTemplateId", "grantId", "onApprovedAR", "createdVIA", "isRttapa", "onAR", "rtrOrder", "source", "deletedAt", "mapsToParrentGoalId")
    SELECT
      "name", "status", "timeframe", "isFromSmartSheetTtaPlan", "createdAt", "updatedAt", "endDate", "goalTemplateId", "grantId", "onApprovedAR", "createdVIA", "isRttapa", "onAR", "rtrOrder", "source", "deletedAt", "mapsToParrentGoalId"
    FROM new_goals;
    `);
};

export default createMonitoringGoals;
