/* eslint-disable import/prefer-default-export */
/* eslint-disable max-len */
import { Op, QueryTypes } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  ActivityReport,
  sequelize,
} from '../../models';

export async function getCourseUrlWidgetData(url, scopes) {
  // Date to retrieve report data from.
  const reportCreatedAtDate = '2022-12-01';

  // Get report ids using the scopes.
  const reportIds = await ActivityReport.findAll({
    attributes: [
      'id',
    ],
    where: {
      [Op.and]: [
        scopes.activityReport,
        {
          calculatedStatus: REPORT_STATUSES.APPROVED,
          startDate: { [Op.ne]: null },
          createdAt: { [Op.gt]: reportCreatedAtDate },
        },
      ],
    },
    raw: true,
  });

  // Make sure we have at least one report id.
  if (reportIds.length === 0) {
    reportIds.push({ id: 0 });
  }

  // Calculate widget data.
  const flatCourseSql = /* sql */ `
    WITH counts AS (
        SELECT
        c."name",
            MIN(ar."startDate") AS "minStartDate",
            MAX(ar."startDate") AS "maxStartDate",
            to_char(ar."startDate", 'Mon-YY') AS "rollUpDate",
            count(DISTINCT ar.id) AS "count" -- Count per AR.
        FROM "ActivityReports" ar
        INNER JOIN "ActivityReportObjectives" aro
            ON ar.id = aro."activityReportId"
        INNER JOIN "ActivityReportObjectiveResources" aror
            ON aro.id = aror."activityReportObjectiveId"
        INNER JOIN "Resources" r
            ON aror."resourceId" = r.id
        INNER JOIN "ActivityReportObjectiveCourses" aroc
            ON aro."id" = aroc."activityReportObjectiveId"
        INNER JOIN "Courses" c
            ON aroc."courseId" = c.id
        WHERE
            ar.id IN (${reportIds.map((r) => r.id).join(',')}) AND r.url = '${url}'
        GROUP BY c.name, to_char(ar."startDate", 'Mon-YY')
        ),
        totals AS (
            SELECT
                "name",
                sum("count") AS "total"
            FROM counts
            GROUP BY "name"
        ),
        dates AS (
            SELECT
            generate_series(
                date_trunc('month', (SELECT MIN("minStartDate") FROM "counts")),
                date_trunc('month', (SELECT MAX("maxStartDate") FROM "counts")),
                interval '1 month'
            )::date AS "date"
        )
        SELECT
            c."name" AS "course",
            to_char(d."date", 'Mon-YY') AS "rollUpDate",
            c."count" AS "count",
            COALESCE(t.total, 0) AS "total"
            FROM "counts" c
        CROSS JOIN dates d
        LEFT JOIN "totals" t
            ON c."name" = t."name"
        ORDER BY COALESCE(t.total, 0) DESC, c."name" ASC
  `;

  // Execute the query.
  return sequelize.query(
    flatCourseSql,
    {
      type: QueryTypes.SELECT,
    },
  );
}
