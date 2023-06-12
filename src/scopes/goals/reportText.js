import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const nextStepsPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "NextSteps".note';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "ActivityReports" on "ActivityReports"."id" = "ActivityReportGoals"."activityReportId"
  LEFT JOIN "NextSteps"
  ON "NextSteps"."activityReportId" = "ActivityReports"."id"
  WHERE "NextSteps".note${a}`;
};

const argsPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReportGoals".name';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals" 
  WHERE "ActivityReportGoals".name${a}`;
};

const objectiveTitlePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReportObjectives".title';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "Objectives" on "Objectives"."goalId" = "ActivityReportGoals"."goalId"
  LEFT JOIN "ActivityReportObjectives" on "ActivityReportObjectives"."objectiveId" = "Objectives"."id"
  WHERE "ActivityReportObjectives".title${a}`;
};

const objectiveTtaProvidedPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReportObjectives"."ttaProvided"';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "Objectives" on "Objectives"."goalId" = "ActivityReportGoals"."goalId"
  LEFT JOIN "ActivityReportObjectives" on "ActivityReportObjectives"."objectiveId" = "Objectives"."id"
  WHERE "ActivityReportObjectives"."ttaProvided"${a}`;
};

const activityReportResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "Resources"."url"';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "ActivityReports" 
  ON "ActivityReports"."id" = "ActivityReportGoals"."activityReportId"
  LEFT JOIN "ActivityReportResources"
  ON "ActivityReportResources"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "Resources"
  ON "Resources"."id" = "ActivityReportResources"."resourceId"
  WHERE "Resources"."url"${a}`;
};

const activityReportGoalResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "Resources"."url"';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "ActivityReportGoalResources" on "ActivityReportGoalResources"."activityReportGoalId" = "ActivityReportGoals"."id"
  LEFT JOIN "Resources" on "Resources"."id" = "ActivityReportGoalResources"."resourceId"
  WHERE "Resources"."url"${a}`;
};

const activityReportObjectiveResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "Resources"."url"';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "Objectives" on "Objectives"."goalId" = "ActivityReportGoals"."goalId"
  LEFT JOIN "ActivityReportObjectives" on "ActivityReportObjectives"."objectiveId" = "Objectives"."id"
  LEFT JOIN "ActivityReportObjectiveResources" on "ActivityReportObjectiveResources"."activityReportObjectiveId" = "ActivityReportObjectives"."id"
  LEFT JOIN "Resources" on "Resources"."id" = "ActivityReportObjectiveResources"."resourceId"
  WHERE "Resources"."url"${a}`;
};

const nextStepsResourcePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "Resources"."url"';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "ActivityReports" on "ActivityReports"."id" = "ActivityReportGoals"."activityReportId"
  LEFT JOIN "NextSteps"
  ON "NextSteps"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "NextStepResources"
  ON "NextSteps"."id" = "NextStepResources"."nextStepId"
  LEFT JOIN "Resources"
  ON "Resources"."id" = "NextStepResources"."resourceId"
  WHERE "Resources"."url"${a}`;
};

const activityReportContextPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReports"."context"';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "ActivityReports" on "ActivityReports"."id" = "ActivityReportGoals"."activityReportId"
  WHERE "ActivityReports"."context"${a}`;
};

const additionalNotesPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReports"."additionalNotes"';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "ActivityReports" on "ActivityReports"."id" = "ActivityReportGoals"."activityReportId"
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
    [Op.and]: [
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
