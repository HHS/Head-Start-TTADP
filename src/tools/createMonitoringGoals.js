import {
  sequelize,
  GoalTemplate,
} from '../models';

import { auditLogger } from '../logger';

const createMonitoringGoals = async () => {
  const cutOffDate = '2023-12-01';
  const monitoringTemplateName = '(Monitoring) The recipient will develop and implement a QIP/CAP to address monitoring findings.';

  // Verify that the monitoring goal template exists.
  const monitoringGoalTemplate = await GoalTemplate.findOne({
    where: {
      templateName: monitoringTemplateName,
    },
  });

  // If the monitoring goal template does not exist, throw an error.
  if (!monitoringGoalTemplate) {
    auditLogger.error('Monitoring Goal template not found');
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
        'Not started' "status",
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
  `);

  // Reopen monitoring goals for grants that need them.
  await sequelize.query(`
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
          AND g.status = 'Closed'
        GROUP BY 1
      )
    UPDATE "Goals"
    SET "status" = 'Not started',
      "updatedAt" = NOW()
    FROM grants_needing_goal_reopend
    WHERE "Goals".id = grants_needing_goal_reopend."goalId";
  `);
};

export default createMonitoringGoals;
