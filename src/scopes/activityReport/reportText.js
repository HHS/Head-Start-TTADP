import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const nextStepsPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "NextSteps".note';

  return `
  SELECT DISTINCT
    "ActivityReports"."id" as "activityReportId"
  FROM "ActivityReports" "ActivityReports"
  LEFT JOIN "NextSteps" "NextSteps"
  ON "NextSteps"."activityReportId" = "ActivityReports"."id"
  WHERE "NextSteps".note${a}`;
};

const argsPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReportGoals".name';

  return `
  SELECT DISTINCT
    "ActivityReports"."id" as "activityReportId"
  FROM "ActivityReports" "ActivityReports"
  LEFT JOIN "ActivityReportGoals" "ActivityReportGoals"
  ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
  WHERE "ActivityReportGoals".name${a}`;
};

const objectiveTitlePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReportObjectives".title';

  return `
  SELECT DISTINCT
    "ActivityReports"."id" as "activityReportId"
  FROM "ActivityReports" "ActivityReports"
  LEFT JOIN "ActivityReportObjectives" "ActivityReportObjectives"
  ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"
  WHERE "ActivityReportObjectives".title${a}`;
};

const objectiveTtaProvidedPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReportObjectives"."ttaProvided"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id" as "activityReportId"
  FROM "ActivityReports" "ActivityReports"
  LEFT JOIN "ActivityReportObjectives" "ActivityReportObjectives"
  ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"
  WHERE "ActivityReportObjectives"."ttaProvided"${a}`;
};

const activityReportResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "Resources"."url"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id" as "activityReportId"
  FROM "ActivityReports" "ActivityReports"
  LEFT JOIN "ActivityReportResources" "ActivityReportResources"
  ON "ActivityReportResources"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "Resources" "Resources"
  ON "Resources"."id" = "ActivityReportResources"."resourceId"
  WHERE "Resources"."url"${a}`;
};

const activityReportGoalResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "Resources"."url"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id" as "activityReportId"
  FROM "ActivityReports" "ActivityReports"
  LEFT JOIN "ActivityReportGoals" "ActivityReportGoals"
  ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "ActivityReportGoalResources" "ActivityReportGoalResources"
  ON "ActivityReportGoalResources"."activityReportGoalId" = "ActivityReportGoals"."id"
  LEFT JOIN "Resources" "Resources"
  ON "Resources"."id" = "ActivityReportGoalResources"."resourceId"
  WHERE "Resources"."url"${a}`;
};

const activityReportObjectiveResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "Resources"."url"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id" as "activityReportId"
  FROM "ActivityReports" "ActivityReports"
  LEFT JOIN "ActivityReportObjectives" "ActivityReportObjectives"
  ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "ActivityReportObjectiveResources" "ActivityReportObjectiveResources"
  ON "ActivityReportObjectiveResources"."activityReportObjectiveId" = "ActivityReportObjectives"."id"
  LEFT JOIN "Resources" "Resources"
  ON "Resources"."id" = "ActivityReportObjectiveResources"."resourceId"
  WHERE "Resources"."url"${a}`;
};

const nextStepsResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "Resources"."url"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id" as "activityReportId"
  FROM "ActivityReports" "ActivityReports"
  LEFT JOIN "NextSteps" "NextSteps"
  ON "NextSteps"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "NextStepResources" "NextStepResources"
  ON "NextSteps"."id" = "NextStepResources"."nextStepId"
  LEFT JOIN "Resources" "Resources"
  ON "Resources"."id" = "NextStepResources"."resourceId"
  WHERE "Resources"."url"${a}`;
};

const activityReportContextPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReports"."context"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id" as "activityReportId"
  FROM "ActivityReports" "ActivityReports"
  WHERE "ActivityReports"."context"${a}`;
};

const additionalNotesPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReports"."additionalNotes"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports" "ActivityReports"
  WHERE "ActivityReports"."additionalNotes"${a}`;
};

export function withReportText(searchText) {
  const search = [`%${searchText}%`];

  return {
    [Op.or]: [
      filterAssociation(nextStepsPosNeg(true), search, false, 'ILIKE'),
      filterAssociation(argsPosNeg(true), search, false, 'ILIKE'),
      filterAssociation(objectiveTitlePosNeg(true), search, false, 'ILIKE'),
      filterAssociation(objectiveTtaProvidedPosNeg(true), search, false, 'ILIKE'),
      filterAssociation(activityReportResourcePosNeg(true), search, false, 'ILIKE'),
      filterAssociation(activityReportGoalResourcePosNeg(true), search, false, 'ILIKE'),
      filterAssociation(activityReportObjectiveResourcePosNeg(true), search, false, 'ILIKE'),
      filterAssociation(nextStepsResourcePosNeg(true), search, false, 'ILIKE'),
      filterAssociation(activityReportContextPosNeg(true), search, false, 'ILIKE'),
      filterAssociation(additionalNotesPosNeg(true), search, false, 'ILIKE'),
    ],
  };
}

export function withoutReportText(searchText) {
  const search = [`%${searchText}%`];

  return {
    [Op.or]: [
      filterAssociation(nextStepsPosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(argsPosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(objectiveTitlePosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(objectiveTtaProvidedPosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(activityReportResourcePosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(activityReportGoalResourcePosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(activityReportObjectiveResourcePosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(nextStepsResourcePosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(activityReportContextPosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(additionalNotesPosNeg(false), search, false, 'NOT ILIKE'),
    ],
  };
}
