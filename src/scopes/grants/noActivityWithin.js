/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
import { sequelize } from '../../models';

const grantsMissingActivitySql = (beginActivityDate, finishActivityDate) => sequelize.literal(
  `
    -- Determine what grants have activity reports within the given date range.
    -- From that list of grants, determine which grants are not in that list (no activity).
    -- OVERLAPS excludes matches on the start and end dates, so we add and subtract a day.
    (WITH activity AS (
      SELECT
        g."id" AS used_grant_id
      FROM "Grants" g
      JOIN "Goals" gl
        ON g.id = gl."grantId"
      JOIN "ActivityReportGoals" arg
        ON gl.id = arg."goalId"
      JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
      WHERE (ar."startDate", ar."endDate") OVERLAPS (DATE ${sequelize.escape(beginActivityDate)} - 1, DATE ${sequelize.escape(finishActivityDate)} + 1)
      )
      SELECT
        g."id"
      FROM "Grants" g
      WHERE g."id" NOT IN (SELECT used_grant_id FROM  activity))
    `,
);

export function noActivityWithin(dates) {
  const [startActivityDate, endActivityDate] = dates[0].split('-');
  return {
    id: {
      [Op.in]: grantsMissingActivitySql(startActivityDate, endActivityDate),
    },
  };
}
