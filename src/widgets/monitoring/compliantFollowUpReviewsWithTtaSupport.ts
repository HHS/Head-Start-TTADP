import { REPORT_STATUSES, TRACE_IDS } from '@ttahub/common';
import { uniq } from 'lodash';
import moment from 'moment';
import { Op, QueryTypes } from 'sequelize';
import db, { sequelize } from '../../models';
import { buildContinuousMonths } from '../../scopes/utils';
import type { IScopes } from '../types';
import { MIN_MONITORING_DATE } from './constants';

const {
  ActivityReport,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  GrantCitation,
  Citation,
} = db;

interface ICompliantFollowUpReviewsWithTtaSupport {
  name: string;
  months: string[];
  reviews: IReviewSeries[];
  id: string;
}

interface IMonthlyCounts {
  month_start: string;
  total_reviews: number;
  with_tta: number;
  without_tta: number;
}

interface IReviewSeries {
  name: string;
  values: number[];
}

type MonthCountByMonthStart = Map<string, IMonthlyCounts>;

/**
 * Compliant follow-up reviews, broken out by those with and without citations addressed by approved activity reports during the correction period.
 */
export default async function compliantFollowUpReviewsWithTtaSupport(
  scopes: IScopes
): Promise<ICompliantFollowUpReviewsWithTtaSupport> {
  // First we need to find all grant citations that match the filter, then find all approved reports that reference those citations, to determine the month range and relevant citation IDs for the main query.
  const grantCitations = await GrantCitation.findAll({
    attributes: ['id', 'citationId'],
    where: {
      [Op.and]: [...scopes.grantCitation],
    },
  });

  // Pull out just the citation IDs for the next query
  const citationIds = grantCitations.map((gc) => gc.citationId);

  // If no grant citations exist, we still need to find approved reports to determine the month range,
  // but those reports won't match the citation filter so we'll return zero-filled columns
  const approvedReports = citationIds.length
    ? await ActivityReport.findAll({
        attributes: ['id', 'startDate'],
        where: {
          [Op.and]: [
            ...scopes.activityReport,
            { startDate: { [Op.gte]: MIN_MONITORING_DATE } },
            { calculatedStatus: REPORT_STATUSES.APPROVED },
          ],
        },
        include: [
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            required: true,
            attributes: [],
            include: [
              {
                model: ActivityReportObjectiveCitation,
                as: 'activityReportObjectiveCitations',
                required: true,
                attributes: [],
                include: [
                  {
                    model: Citation,
                    as: 'citationModel',
                    required: true,
                    attributes: [],
                    where: { id: { [Op.in]: citationIds } },
                  },
                ],
              },
            ],
          },
        ],
      })
    : await ActivityReport.findAll({
        attributes: ['id', 'startDate'],
        where: {
          [Op.and]: [
            ...scopes.activityReport,
            { startDate: { [Op.gte]: MIN_MONITORING_DATE } },
            { calculatedStatus: REPORT_STATUSES.APPROVED },
            sequelize.literal(`EXISTS (
              SELECT 1
              FROM "ActivityReportObjectives" aro
              JOIN "ActivityReportObjectiveCitations" aroc ON aroc."activityReportObjectiveId" = aro.id
              JOIN "Citations" c ON c.id = aroc."citationId"
              WHERE aro."activityReportId" = "ActivityReport".id
                AND c."deletedAt" IS NULL
            )`),
          ],
        },
      });

  // Get the unique month starts from the approved reports
  const months = uniq(
    approvedReports.map((report: (typeof approvedReports)[number]) =>
      moment(report.getDataValue('startDate') as string)
        .startOf('month')
        .format('YYYY-MM-DD')
    )
  ).sort() as string[];

  // Build out a continuous month range for the main query
  const continuousMonths = buildContinuousMonths(months);

  // If no approved reports exist, we can return early with zero-filled columns since there won't be any matching the citation filter
  if (!continuousMonths.length) {
    return {
      name: 'Compliant Follow-up Reviews with TTA Support',
      months: [],
      reviews: [
        { name: 'Follow-up reviews with TTA', values: [] },
        { name: 'Follow-up reviews without TTA', values: [] },
        { name: 'Total', values: [] },
      ],
      id: TRACE_IDS.COMPLIANT_FOLLOW_UP_REVIEWS_WITH_TTA_SUPPORT,
    };
  }

  // If there are approved reports but no grant citations, we can return early with empty-string-filled columns since the reports won't match the citation filter
  if (!grantCitations.length) {
    const x = continuousMonths.map((month) => moment(month).format('MMM YYYY'));

    return {
      name: 'Compliant Follow-up Reviews with TTA Support',
      months: x,
      reviews: [
        { name: 'Follow-up reviews with TTA', values: x.map(() => 0) },
        { name: 'Follow-up reviews without  TTA', values: x.map(() => 0) },
        { name: 'Total', values: x.map(() => 0) },
      ],
      id: TRACE_IDS.COMPLIANT_FOLLOW_UP_REVIEWS_WITH_TTA_SUPPORT,
    };
  }

  // Main query to get the count of follow-up reviews with and without TTA support for each month in the range
  const rows = await sequelize.query<IMonthlyCounts>(
    `WITH months AS (
      SELECT unnest(ARRAY[:monthStarts]::date[]) AS month_start
    ),
    review_set AS (
      SELECT
        dr.review_name,
        month_start,
        bool_or(ar.id IS NOT NULL) has_tta
      FROM "GrantDeliveredReviews" gdr
      JOIN "DeliveredReviews" dr
        ON gdr."deliveredReviewId" = dr.id
      JOIN months
        ON dr.complete_date BETWEEN month_start AND month_start + INTERVAL '1 month' - INTERVAL '1 day'
      LEFT JOIN "DeliveredReviewCitations" drc
        ON dr.id = drc."deliveredReviewId"
      LEFT JOIN "Citations" c
        ON drc."citationId" = c.id
        AND c."deletedAt" IS NULL
      LEFT JOIN "ActivityReportObjectiveCitations" aroc
        ON aroc."citationId" = c.id
      LEFT JOIN "ActivityReportObjectives" aro
        ON aroc."activityReportObjectiveId" = aro.id
      LEFT JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        AND ar."calculatedStatus" = 'approved'
        AND ar."startDate" BETWEEN report_delivery_date AND complete_date
      WHERE dr."deletedAt" IS NULL
        AND dr.complete
      GROUP BY 1,2
    )
    SELECT
      month_start,
      COUNT(review_name) total_reviews,
      COUNT(review_name) FILTER (WHERE has_tta) with_tta,
      COUNT(review_name) FILTER (WHERE NOT has_tta) without_tta
    FROM review_set
    GROUP BY 1
    ORDER BY 1;`,
    {
      replacements: {
        monthStarts: continuousMonths.map((month) => moment(month).format('YYYY-MM-DD')),
      },
      type: QueryTypes.SELECT,
    }
  );

  const rowsByMonthStart: MonthCountByMonthStart = new Map(
    rows.map((row: IMonthlyCounts) => [row.month_start, row])
  );
  const monthRowsFormatted: string[] = continuousMonths.map((month) =>
    moment(month).format('MMM YYYY')
  );

  const response = {
    name: 'Compliant Follow-up Reviews with TTA Support',
    months: monthRowsFormatted,
    reviews: [
      {
        name: 'Follow-up reviews with TTA',
        values: continuousMonths.map((month) => rowsByMonthStart.get(month)?.with_tta ?? 0),
      },
      {
        name: 'Follow-up reviews without  TTA',
        values: continuousMonths.map((month) => rowsByMonthStart.get(month)?.without_tta ?? 0),
      },
      {
        name: 'Total',
        values: continuousMonths.map((month) => rowsByMonthStart.get(month)?.total_reviews ?? 0),
      },
    ],
    id: TRACE_IDS.COMPLIANT_FOLLOW_UP_REVIEWS_WITH_TTA_SUPPORT,
  };

  return response;
}
