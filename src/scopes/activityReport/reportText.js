import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const nextStepsPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "NextSteps".note';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "NextSteps"
  ON "NextSteps"."activityReportId" = "ActivityReports"."id"
  WHERE "NextSteps".note${a}`;
};

const argsPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReportGoals".name';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "ActivityReportGoals"
  ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
  WHERE "ActivityReportGoals".name${a}`;
};

const objectiveTitlePosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReportObjectives".title';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "ActivityReportObjectives"
  ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"
  WHERE "ActivityReportObjectives".title${a}`;
};

const objectiveTtaProvidedPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReportObjectives"."ttaProvided"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "ActivityReportObjectives"
  ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"
  WHERE "ActivityReportObjectives"."ttaProvided"${a}`;
};

const activityReportContextPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReports"."context"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  WHERE "ActivityReports"."context"${a}`;
};

const additionalNotesPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReports"."additionalNotes"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
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
      filterAssociation(activityReportContextPosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(additionalNotesPosNeg(false), search, false, 'NOT ILIKE'),
    ],
  };
}
