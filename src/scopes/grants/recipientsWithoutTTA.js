/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';

const grantsMissingActivitySql = (beginActivityDate, finishActivityDate) => (
  `
    -- Determine what grants have activity reports within the given date range.
    -- From that list of grants, determine which grants are not in that list (no activity).
    WITH activity AS (
      SELECT
        g."id" AS used_grant_id
      FROM "Grants" g
      JOIN "Goals" gl
        ON g.id = gl."grantId"
      JOIN "ActivityReportGoals" arg
        ON gl.id = arg."goalId"
      JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
      WHERE (ar."startDate", ar."endDate") OVERLAPS ('${beginActivityDate}', '${finishActivityDate}')
      )
      SELECT
        g."id"
      FROM "Grants" g
      WHERE g."id" NOT IN (SELECT used_grant_id FROM  activity)
    `
);

export function activityNotWithin(dates) {
  const [startActivityDate, endActivityDate] = dates.split('-');
  return {
    id: {
      [Op.in]: grantsMissingActivitySql(startActivityDate, endActivityDate),
    },
  };
}
