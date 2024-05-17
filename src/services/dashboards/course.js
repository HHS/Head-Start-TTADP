/* eslint-disable import/prefer-default-export */
/* eslint-disable max-len */
import { Op, QueryTypes } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  ActivityReport,
  sequelize,
} from '../../models';

/*

    {
        course: 'Widget Course 3',
        rollUpDate: 'Jan-21',
        count: '1',
        total: '1',
      },
  */

export async function rollUpCourseUrlData(data) {
  const rolledUpCourseData = data.reduce((accumulator, c) => {
    const exists = accumulator.find((e) => e.course === c.course);
    if (!exists) {
      // Add a property with the resource's URL.
      return [
        ...accumulator,
        {
          heading: c.course,
          url: c.course,
          course: c.course,
          title: c.course,
          sortBy: c.course,
          total: c.total,
          isUrl: false,
          data: [{ title: c.rollUpDate, value: c.count }],
        },
      ];
    }

    // Add the resource to the accumulator.
    exists.data.push({ title: c.rollUpDate, value: c.count });
    return accumulator;
  }, []);

  // Loop through the rolled up resources and add a total.
  rolledUpCourseData.forEach((course) => {
    course.data.push({ title: 'Total', value: course.total });
  });

  // Sort by total and course name.
  rolledUpCourseData.sort((r1, r2) => r2.total - r1.total || r1.course.localeCompare(r2.course));
  return rolledUpCourseData;
}

export async function getCourseUrlWidgetData(scopes) {
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
        INNER JOIN "ActivityReportObjectiveCourses" aroc
            ON aro."id" = aroc."activityReportObjectiveId"
        INNER JOIN "Courses" c
            ON aroc."courseId" = c.id
        WHERE
            ar.id IN (${reportIds.map((r) => r.id).join(',')}) 
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
        ORDER BY COALESCE(t.total, 0) DESC, c."name" ASC;
  `;

  // Execute the query.
  const courseData = await sequelize.query(
    flatCourseSql,
    {
      type: QueryTypes.SELECT,
    },
  );

  // Return rollup.
  return rollUpCourseUrlData(courseData);
}
