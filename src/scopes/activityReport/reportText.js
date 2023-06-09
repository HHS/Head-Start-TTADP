import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const nextStepsPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "NextSteps".note';

  return `
  SELECT DISTINCT
    "NextSteps"."activityReportId"
  FROM "NextSteps"
  WHERE "NextSteps".note${a}`;
};

const argsPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReportGoals".name';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."activityReportId"
  FROM "ActivityReportGoals"
  WHERE "ActivityReportGoals".name${a}`;
};

const objectiveTitleAndTtaProvidedPosNeg = (pos = true) => {
  const a = pos ? '' : ` IS NULL OR concat_ws(' ', "ActivityReportObjectives".title, "ActivityReportObjectives"."ttaProvided")`;

  return `
  SELECT DISTINCT
    "ActivityReportObjectives"."activityReportId"
  FROM "ActivityReportObjectives"postgres
  WHERE concat_ws(' ', "ActivityReportObjectives".title, "ActivityReportObjectives"."ttaProvided")${a}`;
};

const activityReportContextandAdditionalNotesPosNeg = (pos = true) => {
  const a = pos ? '' : ` IS NULL OR concat_ws(' ', "ActivityReports"."context", "ActivityReports"."additionalNotes")`;

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  WHERE concat_ws(' ', "ActivityReports"."context", "ActivityReports"."additionalNotes")${a}`;
};

export function withReportText(searchText) {
  const search = [`%${searchText}%`];

  return {
    [Op.or]: [
      filterAssociation(nextStepsPosNeg(true), search, false, 'ILIKE'),
      filterAssociation(argsPosNeg(true), search, false, 'ILIKE'),
      filterAssociation(objectiveTitleAndTtaProvidedPosNeg(true), search, false, 'ILIKE'),
      filterAssociation(activityReportContextandAdditionalNotesPosNeg(true), search, false, 'ILIKE'),
    ],
  };
}

export function withoutReportText(searchText) {
  const search = [`%${searchText}%`];

  return {
    [Op.and]: [
      filterAssociation(nextStepsPosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(argsPosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(objectiveTitleAndTtaProvidedPosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(activityReportContextandAdditionalNotesPosNeg(false), search, false, 'NOT ILIKE'),
    ],
  };
}
