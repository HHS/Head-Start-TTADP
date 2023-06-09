import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const nextStepsPosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `"NextSteps".note IS NULL
    OR`;

  return `
  SELECT DISTINCT
    "NextSteps"."activityReportId"
  FROM "NextSteps"
  WHERE ${a} LOWER("NextSteps".note)`;
};

const argsPosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `"ActivityReportGoals".name IS NULL
    OR`;

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."activityReportId"
  FROM "ActivityReportGoals"
  WHERE ${a} LOWER("ActivityReportGoals".name)`;
};

const objectiveTitleAndTtaProvidedPosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `"ActivityReportObjectives".title IS NULL
    OR "ActivityReportObjectives"."ttaProvided" IS NULL
    OR`;

  return `
  SELECT DISTINCT
    "ActivityReportObjectives"."activityReportId"
  FROM "ActivityReportObjectives"postgres
  WHERE ${a} LOWER(concat_ws(' ', "ActivityReportObjectives".title, "ActivityReportObjectives"."ttaProvided"))`;
};

const activityReportContextandAdditionalNotesPosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `"ActivityReports"."context" IS NULL
    OR "ActivityReports"."additionalNotes" IS NULL
    OR`;

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  WHERE ${a} LOWER(concat_ws(' ', "ActivityReports"."context", "ActivityReports"."additionalNotes"))`;
};

export function withReportText(searchText) {
  const search = [`%${searchText}%`];

  return {
    [Op.or]: [
      filterAssociation(nextStepsPosNeg(true), search, false, 'LIKE'),
      filterAssociation(argsPosNeg(true), search, false, 'LIKE'),
      filterAssociation(objectiveTitleAndTtaProvidedPosNeg(true), search, false, 'LIKE'),
      filterAssociation(activityReportContextandAdditionalNotesPosNeg(true), search, false, 'LIKE'),
    ],
  };
}

export function withoutReportText(searchText) {
  const search = [`%${searchText}%`];

  return {
    [Op.and]: [
      filterAssociation(nextStepsPosNeg(false), search, false, 'NOT LIKE'),
      filterAssociation(argsPosNeg(false), search, false, 'NOT LIKE'),
      filterAssociation(objectiveTitleAndTtaProvidedPosNeg(false), search, false, 'NOT LIKE'),
      filterAssociation(activityReportContextandAdditionalNotesPosNeg(false), search, false, 'NOT LIKE'),
    ],
  };
}
