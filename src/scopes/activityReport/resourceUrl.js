import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const selectDistinctActivityReports = (join, having) => `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  ${join}
  GROUP BY "ActivityReports"."id"
  HAVING ${having}`;

const activityReportResourceIncludeExclude = (include) => {
  const a = include ? '' : 'bool_or("Resources"."url" IS NULL) OR';

  return selectDistinctActivityReports(
    'LEFT JOIN "ActivityReportResources" ON "ActivityReportResources"."activityReportId" = "ActivityReports"."id" LEFT JOIN "Resources" ON "Resources"."id" = "ActivityReportResources"."resourceId"',
    `${a} LOWER(STRING_AGG(CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title"), CHR(10)))`,
  );
};

const activityReportGoalResourceIncludeExclude = (include) => {
  const a = include ? '' : 'bool_or("Resources"."url" IS NULL) OR';

  return selectDistinctActivityReports(
    'LEFT JOIN "ActivityReportGoals" ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id" LEFT JOIN "ActivityReportGoalResources" ON "ActivityReportGoalResources"."activityReportGoalId" = "ActivityReportGoals"."id" LEFT JOIN "Resources" ON "Resources"."id" = "ActivityReportGoalResources"."resourceId"',
    `${a} LOWER(STRING_AGG(CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title"), CHR(10)))`,
  );
};

const activityReportObjectiveResourceIncludeExclude = (include) => {
  const a = include ? '' : 'bool_or("Resources"."url" IS NULL) OR';

  return selectDistinctActivityReports(
    'LEFT JOIN "ActivityReportObjectives" ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id" LEFT JOIN "ActivityReportObjectiveResources" ON "ActivityReportObjectiveResources"."activityReportObjectiveId" = "ActivityReportObjectives"."id" LEFT JOIN "Resources" ON "Resources"."id" = "ActivityReportObjectiveResources"."resourceId"',
    `${a} LOWER(STRING_AGG(CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title"), CHR(10)))`,
  );
};

const nextStepsResourceIncludeExclude = (include) => {
  const a = include ? '' : 'bool_or("Resources"."url" IS NULL) OR';

  return selectDistinctActivityReports(
    'LEFT JOIN "NextSteps" ON "NextSteps"."activityReportId" = "ActivityReports"."id" LEFT JOIN "NextStepResources" ON "NextSteps"."id" = "NextStepResources"."nextStepId" LEFT JOIN "Resources" ON "Resources"."id" = "NextStepResources"."resourceId"',
    `${a} LOWER(STRING_AGG(CONCAT_WS(CHR(10), "Resources"."url", "Resources"."title"), CHR(10)))`,
  );
};

export function withResourceUrl(query) {
  const search = [`%${query.map((st) => st.toLowerCase())}%`];

  return {
    [Op.or]: [
      filterAssociation(activityReportResourceIncludeExclude(true), search, false, 'LIKE'),
      filterAssociation(activityReportGoalResourceIncludeExclude(true), search, false, 'LIKE'),
      filterAssociation(activityReportObjectiveResourceIncludeExclude(true), search, false, 'LIKE'),
      filterAssociation(nextStepsResourceIncludeExclude(true), search, false, 'LIKE'),
    ],
  };
}

export function withoutResourceUrl(query) {
  const search = [`%${query.map((st) => st.toLowerCase())}%`];

  return {
    [Op.and]: [
      filterAssociation(activityReportResourceIncludeExclude(false), search, false, 'NOT LIKE'),
      filterAssociation(activityReportGoalResourceIncludeExclude(false), search, false, 'NOT LIKE'),
      filterAssociation(activityReportObjectiveResourceIncludeExclude(false), search, false, 'NOT LIKE'),
      filterAssociation(nextStepsResourceIncludeExclude(false), search, false, 'NOT LIKE'),
    ],
  };
}
