import { filterAssociation } from './utils';

const goalIds = `
  SELECT DISTINCT
    "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  INNER JOIN "ActivityReports"
  ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
  WHERE "ActivityReports"."endDate"`;

export function beforeEndDate(date) {
  return filterAssociation(goalIds, date, false, '<=');
}

export function afterEndDate(date) {
  return filterAssociation(goalIds, date, false, '>=');
}

export function withinEndDates(dates: string[]) {
  // got: [ '2022/11/23-2023/02/22' ]
  // need: [ '2022/11/23', '2023/02/22']
  const escapedDateStrings = dates[0].split('-').map((d) => `'${d}'`);
  // now: "'2022/11/23'", "'2023/02/22'"
  return filterAssociation(goalIds, escapedDateStrings, false, 'BETWEEN');
}
