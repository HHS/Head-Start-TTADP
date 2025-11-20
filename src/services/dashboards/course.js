/* eslint-disable max-len */
import { Op, QueryTypes } from 'sequelize';
import moment from 'moment';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  ActivityReport,
  sequelize,
} from '../../models';

export async function rollUpCourseUrlData(data) {
  const cutOffDate = new Date('2024-03-07');
  const headers = [];
  const rolledUpCourseData = data.reduce((accumulator, c) => {
    // Add the header to the headers array if it doesn't exist.
    const existsHeader = headers.find((h) => h.rollUpDate === c.rollUpDate);
    if (!existsHeader) {
      headers.push({ rollUpDate: c.rollUpDate, date: new Date(c.date) });
    }
    const exists = accumulator.find((e) => e.course === c.course);
    const beforeCutOff = new Date(c.date) <= cutOffDate;
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
          data: [{ title: c.rollUpDate, value: beforeCutOff ? '-' : c.count, date: c.date }],
        },
      ];
    }

    exists.data.push({ title: c.rollUpDate, value: beforeCutOff ? '-' : c.count, date: c.date });

    return accumulator;
  }, []);

  // Sort each resource's data by date.
  rolledUpCourseData.forEach((course) => {
    course.data.sort((d1, d2) => new Date(d1.date) - new Date(d2.date));
  });

  // Loop through the rolled up resources and add a total.
  rolledUpCourseData.forEach((course) => {
    course.data.push({ title: 'Total', value: course.total });
  });

  // Sort by total and course name.
  rolledUpCourseData.sort((r1, r2) => r2.total - r1.total || r1.course.localeCompare(r2.course));

  // Sort headers by date and return an array of rollUpDate.
  headers.sort((h1, h2) => h1.date - h2.date);

  // Return the headers and rolled up data.
  const sortedHeaders = headers.map((h) => ({
    name: moment(h.rollUpDate, 'MMM-YY').format('MMMM YYYY'),
    displayName: h.rollUpDate,
  }));

  return { headers: sortedHeaders, courses: rolledUpCourseData };
}

export async function getCourseUrlWidgetData(scopes) {
  // Date to retrieve report data from.
  const reportCreatedAtDate = '2022-12-01';

  // Get report ids using the scopes.
  // TODO: We could speed this up by using utils.scopeToWhere to get the where clause.
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
  });

  // Make sure we have at least one report id.
  if (reportIds.length === 0) {
    reportIds.push({ id: 0 });
  }

  // Calculate widget data.
  const flatCourseSql = /* sql */ `
      WITH dates AS (
            SELECT
            generate_series(
                date_trunc('month', MIN("startDate")),
                date_trunc('month', MAX("startDate")),
                interval '1 month'
            )::date AS "date"
            FROM "ActivityReports" ar
            WHERE ar.id IN (${reportIds.map((r) => r.id).join(',')})
        ),
      counts AS (
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
        distinctcourses AS (
          SELECT distinct "name" FROM "counts"
        )
        SELECT
            cor."name" AS "course",
            to_char(d."date", 'Mon-YY') AS "rollUpDate",
            d."date",
            COALESCE(c."count", 0) AS "count",
            COALESCE(t.total, 0) AS "total"
            FROM "distinctcourses" cor
        CROSS JOIN dates d
        LEFT JOIN "totals" t
            ON cor."name" = t."name"
        LEFT JOIN "counts" c
          ON cor."name" = c."name" AND to_char(d."date", 'Mon-YY')  = c."rollUpDate"
        ORDER BY c."name" ASC, d."date" ASC;
  `;

  // Execute the query.
  const courseData = await sequelize.query(
    flatCourseSql,
    {
      type: QueryTypes.SELECT,
    },
  );

  // Return rollup.
  return {
    coursesAssociatedWithActivityReports: await rollUpCourseUrlData(courseData),
  };
}
