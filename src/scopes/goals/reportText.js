import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const nextStepsPosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `bool_or("NextSteps".note IS NULL)
  OR`;

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "ActivityReports" on "ActivityReports"."id" = "ActivityReportGoals"."activityReportId"
  LEFT JOIN "NextSteps"
  ON "NextSteps"."activityReportId" = "ActivityReports"."id"
  GROUP BY "ActivityReportGoals"."goalId"
  HAVING ${a} LOWER(STRING_AGG("NextSteps".note, CHR(10)))`;
};

const argsPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "ActivityReportGoals".name';

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals" 
  WHERE "ActivityReportGoals".name${a}`;
};

const objectiveTitleAndTtaProvidedPosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `bool_or("ActivityReportObjectives".title IS NULL
    OR "ActivityReportObjectives"."ttaProvided" IS NULL)
    OR`;

  return `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "ActivityReports" 
  ON "ActivityReports"."id" = "ActivityReportGoals"."activityReportId"
  LEFT JOIN "ActivityReportObjectives"
  ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"
  GROUP BY "ActivityReportGoals"."goalId"
  HAVING ${a} STRING_AGG(concat_ws(CHR(10), "ActivityReportObjectives".title, "ActivityReportObjectives"."ttaProvided"), CHR(10))`;
};

const activityReportContextandAdditionalNotesPosNeg = () => `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  LEFT JOIN "ActivityReports" 
  ON "ActivityReports"."id" = "ActivityReportGoals"."activityReportId"
  GROUP BY "ActivityReportGoals"."goalId"
  HAVING STRING_AGG(concat_ws(CHR(10), "ActivityReports"."context", "ActivityReports"."additionalNotes"), CHR(10))`;

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
