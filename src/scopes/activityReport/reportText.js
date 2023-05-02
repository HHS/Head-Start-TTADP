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

const goalResources = `
SELECT DISTINCT
  "ActivityReportObjectiveResources"."activityReportId"
FROM "ActivityReportObjectiveResources" "ActivityReportObjectiveResources"
INNER JOIN "Resources" "Resources"
ON "Resources"."id" = "ActivityReportObjectiveResources"."resourceId"
WHERE "Resources"."url"`;

const activityReportResource = `
SELECT DISTINCT
  "ActivityReportResources"."activityReportId"
FROM "ActivityReportResources" "ActivityReportResources"
INNER JOIN "Resources" "Resources"
ON "Resources"."id" = "ActivityReportResources"."resourceId"
WHERE "Resources"."url"`;

const activityReportGoalResource = `
SELECT DISTINCT
  "ActivityReportGoalResources"."activityReportId"
FROM "ActivityReportGoalResources" "ActivityReportGoalResources"
INNER JOIN "Resources" "Resources"
ON "Resources"."id" = "ActivityReportGoalResources"."resourceId"
WHERE "Resources"."url"`;

const activityReportObjectiveResource = `
SELECT DISTINCT
  "ActivityReportObjectiveResources"."activityReportId"
FROM "ActivityReportObjectiveResources" "ActivityReportObjectiveResources"
INNER JOIN "Resources" "Resources"
ON "Resources"."id" = "ActivityReportObjectiveResources"."resourceId"
WHERE "Resources"."url"`;

const nextStepsResource = `
SELECT DISTINCT
  "NextStepsResources"."activityReportId"
FROM "NextStepsResources" "NextStepsResources"
INNER JOIN "Resources" "Resources"
ON "Resources"."id" = "NextStepsResources"."resourceId"
WHERE "Resources"."url"`;

export function withReportText(searchText) {
  return {
    [Op.or]: [
      filterAssociation(nextSteps, searchText, false, 'ILIKE'),
      filterAssociation(args, searchText, false, 'ILIKE'),
      filterAssociation(objectiveTitle, searchText, false, 'ILIKE'),
      filterAssociation(objectiveTtaProvided, searchText, false, 'ILIKE'),
      filterAssociation(goalResources, searchText, false, 'ILIKE'),
      filterAssociation(activityReportResource, searchText, false, 'ILIKE'),
      filterAssociation(activityReportGoalResource, searchText, false, 'ILIKE'),
      filterAssociation(activityReportObjectiveResource, searchText, false, 'ILIKE'),
      filterAssociation(nextStepsResource, searchText, false, 'ILIKE'),
    ],
  };
}

export function withoutReportText(searchText) {
  return {
    [Op.and]: [
      filterAssociation(nextSteps, searchText, false, 'NOT ILIKE'),
      filterAssociation(args, searchText, false, 'NOT ILIKE'),
      filterAssociation(objectiveTitle, searchText, false, 'NOT ILIKE'),
      filterAssociation(objectiveTtaProvided, searchText, false, 'NOT ILIKE'),
      filterAssociation(goalResources, searchText, false, 'NOT ILIKE'),
      filterAssociation(activityReportResource, searchText, false, 'NOT ILIKE'),
      filterAssociation(activityReportGoalResource, searchText, false, 'NOT ILIKE'),
      filterAssociation(activityReportObjectiveResource, searchText, false, 'NOT ILIKE'),
      filterAssociation(nextStepsResource, searchText, false, 'NOT ILIKE'),
    ],
  };
}
