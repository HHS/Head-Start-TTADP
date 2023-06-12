import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const nextStepsPosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `bool_or("NextSteps".note IS NULL)
    OR`;

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "NextSteps"
  ON "NextSteps"."activityReportId" = "ActivityReports"."id"
  GROUP BY "ActivityReports"."id"
  HAVING ${a} STRING_AGG(LOWER("NextSteps".note), CHR(10))`;
};

const argsPosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `bool_or("ActivityReportGoals".name IS NULL)
    OR`;

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "ActivityReportGoals"
  ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
  GROUP BY "ActivityReports"."id"
  HAVING ${a} STRING_AGG(LOWER("ActivityReportGoals".name), CHR(10))`;
};

const objectiveTitleAndTtaProvidedPosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `bool_or("ActivityReportObjectives".title IS NULL
    OR "ActivityReportObjectives"."ttaProvided" IS NULL)
    OR`;

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "ActivityReportObjectives"
  ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"
  GROUP BY "ActivityReports"."id"
  HAVING ${a} STRING_AGG(concat_ws(CHR(10), LOWER("ActivityReportObjectives".title), LOWER("ActivityReportObjectives"."ttaProvided")), CHR(10))`;
};

const activityReportContextandAdditionalNotesPosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `bool_or("ActivityReports"."context" IS NULL)
    OR`;

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  GROUP BY "ActivityReports"."id"
  HAVING ${a} STRING_AGG(concat_ws(CHR(10), LOWER("ActivityReports"."context"), LOWER("ActivityReports"."additionalNotes")), CHR(10))`;
};

export function withReportText(searchText) {
  const search = [`%${searchText.map((st) => st.toLowerCase())}%`];

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
  const search = [`%${searchText.map((st) => st.toLowerCase())}%`];

  return {
    [Op.and]: [
      filterAssociation(nextStepsPosNeg(false), search, false, 'NOT LIKE'),
      filterAssociation(argsPosNeg(false), search, false, 'NOT LIKE'),
      filterAssociation(objectiveTitleAndTtaProvidedPosNeg(false), search, false, 'NOT LIKE'),
      filterAssociation(activityReportContextandAdditionalNotesPosNeg(false), search, false, 'NOT LIKE'),
    ],
  };
}
