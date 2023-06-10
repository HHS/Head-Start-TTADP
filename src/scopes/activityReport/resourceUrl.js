import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const activityReportResourcePosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `bool_or("Resources"."url" IS NULL)
    OR`;

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "ActivityReportResources"
  ON "ActivityReportResources"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "Resources"
  ON "Resources"."id" = "ActivityReportResources"."resourceId"
  GROUP BY "ActivityReports"."id"
  HAVING ${a} LOWER(STRING_AGG(CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title"), CHR(10)))`;
};

const activityReportGoalResourcePosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `bool_or("Resources"."url" IS NULL)
    OR`;

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
  GROUP BY "ActivityReports"."id"
  HAVING ${a} LOWER(STRING_AGG(CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title"), CHR(10)))`;
};

const activityReportObjectiveResourcePosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `bool_or("Resources"."url" IS NULL)
    OR`;

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
  GROUP BY "ActivityReports"."id"
  HAVING ${a} LOWER(STRING_AGG(CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title"), CHR(10)))`;
};

const nextStepsResourcePosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `bool_or("Resources"."url" IS NULL)
    OR`;

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
  GROUP BY "ActivityReports"."id"
  HAVING ${a} LOWER(STRING_AGG(CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title"), CHR(10)))`;
};

export function withResourceUrl(query) {
  const search = [`%${query.map((st) => st.toLowerCase())}%`];

  return {
    [Op.or]: [
      filterAssociation(activityReportResourcePosNeg(true), search, false, 'LIKE'),
      filterAssociation(activityReportGoalResourcePosNeg(true), search, false, 'LIKE'),
      filterAssociation(activityReportObjectiveResourcePosNeg(true), search, false, 'LIKE'),
      filterAssociation(nextStepsResourcePosNeg(true), search, false, 'LIKE'),
    ],
  };
}

export function withoutResourceUrl(query) {
  const search = [`%${query.map((st) => st.toLowerCase())}%`];

  return {
    [Op.and]: [
      filterAssociation(activityReportResourcePosNeg(false), search, false, 'NOT LIKE'),
      filterAssociation(activityReportGoalResourcePosNeg(false), search, false, 'NOT LIKE'),
      filterAssociation(activityReportObjectiveResourcePosNeg(false), search, false, 'NOT LIKE'),
      filterAssociation(nextStepsResourcePosNeg(false), search, false, 'NOT LIKE'),
    ],
  };
}
