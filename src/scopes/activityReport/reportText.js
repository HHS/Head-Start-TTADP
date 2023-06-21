import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const selectDistinctActivityReports = (select, join, groupBy, having) => `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  ${join}
  GROUP BY ${groupBy}
  HAVING ${having}`;

const nextStepsPosNeg = (pos = true) => {
  const a = pos ? '' : 'bool_or("NextSteps".note IS NULL) OR';

  return selectDistinctActivityReports(
    '',
    'LEFT JOIN "NextSteps" ON "NextSteps"."activityReportId" = "ActivityReports"."id"',
    '"ActivityReports"."id"',
    `${a} LOWER(STRING_AGG("NextSteps".note, CHR(10)))`,
  );
};

const argsPosNeg = (pos = true) => {
  const a = pos ? '' : 'bool_or("ActivityReportGoals".name IS NULL) OR';

  return selectDistinctActivityReports(
    '',
    'LEFT JOIN "ActivityReportGoals" ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"',
    '"ActivityReports"."id"',
    `${a} LOWER(STRING_AGG("ActivityReportGoals".name, CHR(10)))`,
  );
};

const objectiveTitleAndTtaProvidedPosNeg = (pos = true) => {
  const a = pos
    ? ''
    : `bool_or("ActivityReportObjectives".title IS NULL OR
    "ActivityReportObjectives"."ttaProvided" IS NULL) OR`;

  return selectDistinctActivityReports(
    '',
    'LEFT JOIN "ActivityReportObjectives" ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"',
    '"ActivityReports"."id"',
    `${a} LOWER(STRING_AGG(concat_ws(CHR(10), "ActivityReportObjectives".title, "ActivityReportObjectives"."ttaProvided"), CHR(10)))`,
  );
};

const activityReportContextandAdditionalNotesPosNeg = (pos = true) => {
  const a = pos ? '' : 'bool_or("ActivityReports"."context" IS NULL) OR';

  return selectDistinctActivityReports(
    '',
    '',
    '"ActivityReports"."id"',
    `${a} LOWER(STRING_AGG(concat_ws(CHR(10), "ActivityReports"."context", "ActivityReports"."additionalNotes"), CHR(10)))`,
  );
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
