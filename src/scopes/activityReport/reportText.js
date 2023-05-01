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

export function withReportText(searchText) {
  return {
    [Op.or]: [
      filterAssociation(nextSteps, searchText, false, 'ILIKE'),
      filterAssociation(args, searchText, false, 'ILIKE'),
      filterAssociation(objectiveTitle, searchText, false, 'ILIKE'),
      filterAssociation(objectiveTtaProvided, searchText, false, 'ILIKE'),
      filterAssociation(goalResources, searchText, false, 'ILIKE'),
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
    ],
  };
}
