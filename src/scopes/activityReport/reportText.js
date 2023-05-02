import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const nextSteps = `
SELECT DISTINCT
  "NextSteps"."activityReportId"
FROM "NextSteps" "NextSteps"
WHERE "NextSteps".note`;

const args = `
SELECT DISTINCT
  "ActivityReportGoals"."activityReportId"
FROM "ActivityReportGoals" "ActivityReportGoals"
WHERE "ActivityReportGoals".name`;

const objectiveTitle = `
SELECT DISTINCT
  "ActivityReportObjectives"."activityReportId"
FROM "ActivityReportObjectives" "ActivityReportObjectives"
WHERE "ActivityReportObjectives".title`;

const objectiveTtaProvided = `
SELECT DISTINCT
  "ActivityReportObjectives"."activityReportId"
FROM "ActivityReportObjectives" "ActivityReportObjectives"
WHERE "ActivityReportObjectives"."ttaProvided"`;

const activityReportResource = `
SELECT DISTINCT
  "ActivityReportResources"."activityReportId"
FROM "ActivityReportResources" "ActivityReportResources"
INNER JOIN "Resources" "Resources"
ON "Resources"."id" = "ActivityReportResources"."resourceId"
WHERE "Resources"."url"`;

const activityReportGoalResource = `
SELECT DISTINCT
  "ActivityReportGoals"."activityReportId"
FROM "ActivityReportGoals" "ActivityReportGoals"
INNER JOIN "ActivityReportGoalResources" "ActivityReportGoalResources"
ON "ActivityReportGoalResources"."activityReportGoalId" = "ActivityReportGoals"."id"
INNER JOIN "Resources" "Resources"
ON "Resources"."id" = "ActivityReportGoalResources"."resourceId"
WHERE "Resources"."url"`;

const activityReportObjectiveResource = `
SELECT DISTINCT
  "ActivityReportObjectives"."activityReportId"
FROM "ActivityReportObjectives" "ActivityReportObjectives"
INNER JOIN "ActivityReportObjectiveResources" "ActivityReportObjectiveResources"
ON "ActivityReportObjectiveResources"."activityReportObjectiveId" = "ActivityReportObjectives"."id"
INNER JOIN "Resources" "Resources"
ON "Resources"."id" = "ActivityReportObjectiveResources"."resourceId"
WHERE "Resources"."url"`;

const nextStepsResource = `
SELECT DISTINCT
  "NextSteps"."activityReportId"
FROM "NextSteps" "NextSteps"
INNER JOIN "NextStepResources" "NextStepResources"
ON "NextSteps"."id" = "NextStepResources"."nextStepId"
INNER JOIN "Resources" "Resources"
ON "Resources"."id" = "NextStepResources"."resourceId"
WHERE "Resources"."url"`;

const activityReportContext = `
SELECT DISTINCT
  "ActivityReports"."id"
FROM "ActivityReports" "ActivityReports"
WHERE "ActivityReports"."context"`;

export function withReportText(searchText) {
  const search = [`%${searchText}%`];

  return {
    [Op.or]: [
      filterAssociation(nextSteps, search, false, 'ILIKE'),
      filterAssociation(args, search, false, 'ILIKE'),
      filterAssociation(objectiveTitle, search, false, 'ILIKE'),
      filterAssociation(objectiveTtaProvided, search, false, 'ILIKE'),
      filterAssociation(activityReportResource, search, false, 'ILIKE'),
      filterAssociation(activityReportGoalResource, search, false, 'ILIKE'),
      filterAssociation(activityReportObjectiveResource, search, false, 'ILIKE'),
      filterAssociation(nextStepsResource, search, false, 'ILIKE'),
      filterAssociation(activityReportContext, search, false, 'ILIKE'),
    ],
  };
}

export function withoutReportText(searchText) {
  const search = [`%${searchText}%`];

  return {
    [Op.and]: [
      filterAssociation(nextSteps, search, true, 'NOT ILIKE'),
      filterAssociation(args, search, true, 'NOT ILIKE'),
      filterAssociation(objectiveTitle, search, true, 'NOT ILIKE'),
      filterAssociation(objectiveTtaProvided, search, true, 'NOT ILIKE'),
      filterAssociation(activityReportResource, search, true, 'NOT ILIKE'),
      filterAssociation(activityReportGoalResource, search, true, 'NOT ILIKE'),
      filterAssociation(activityReportObjectiveResource, search, true, 'NOT ILIKE'),
      filterAssociation(nextStepsResource, search, true, 'NOT ILIKE'),
      filterAssociation(activityReportContext, search, true, 'NOT ILIKE'),
    ],
  };
}
