import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const activityReportResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title")';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "ActivityReportResources"
  ON "ActivityReportResources"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "Resources"
  ON "Resources"."id" = "ActivityReportResources"."resourceId"
  WHERE CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title")${a}`;
};

const activityReportGoalResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title")';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "ActivityReportGoals"
  ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "ActivityReportGoalResources"
  ON "ActivityReportGoalResources"."activityReportGoalId" = "ActivityReportGoals"."id"
  LEFT JOIN "Resources"
  ON "Resources"."id" = "ActivityReportGoalResources"."resourceId"
  WHERE CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title")${a}`;
};

const activityReportObjectiveResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title")';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "ActivityReportObjectives"
  ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "ActivityReportObjectiveResources"
  ON "ActivityReportObjectiveResources"."activityReportObjectiveId" = "ActivityReportObjectives"."id"
  LEFT JOIN "Resources"
  ON "Resources"."id" = "ActivityReportObjectiveResources"."resourceId"
  WHERE CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title")${a}`;
};

const nextStepsResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title")';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "NextSteps"
  ON "NextSteps"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "NextStepResources"
  ON "NextSteps"."id" = "NextStepResources"."nextStepId"
  LEFT JOIN "Resources"
  ON "Resources"."id" = "NextStepResources"."resourceId"
  WHERE CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title")${a}`;
};

export function withResourceUrl(query) {
  const search = [`%${query}%`];

  return {
    [Op.or]: [
      filterAssociation(activityReportResourcePosNeg(true), search, false, 'ILIKE'),
      filterAssociation(activityReportGoalResourcePosNeg(true), search, false, 'ILIKE'),
      filterAssociation(activityReportObjectiveResourcePosNeg(true), search, false, 'ILIKE'),
      filterAssociation(nextStepsResourcePosNeg(true), search, false, 'ILIKE'),
    ],
  };
}

export function withoutResourceUrl(query) {
  const search = [`%${query}%`];

  return {
    [Op.and]: [
      filterAssociation(activityReportResourcePosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(activityReportGoalResourcePosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(activityReportObjectiveResourcePosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(nextStepsResourcePosNeg(false), search, false, 'NOT ILIKE'),
    ],
  };
}
