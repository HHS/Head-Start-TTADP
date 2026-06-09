import { TRACE_IDS } from '@ttahub/common';
import { uniq } from 'lodash';
import moment from 'moment';
import { Op, QueryTypes } from 'sequelize';
import db, { sequelize } from '../../models';
import type { IScopes } from '../types';
import { MIN_MONITORING_DATE } from './constants';

/* eslint-disable @typescript-eslint/no-explicit-any */
const { DeliveredReview, GrantCitation, GrantDeliveredReview } = db as any;

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

const EMPTY_RESULT: ICompliantFollowUpReviewsWithTtaSupport = {
  name: 'Compliant Follow-up Reviews with TTA Support',
  months: [],
  reviews: [
    { name: 'Follow-up reviews with TTA', values: [] },
    { name: 'Follow-up reviews without TTA', values: [] },
    { name: 'Total', values: [] },
  ],
  id: TRACE_IDS.COMPLIANT_FOLLOW_UP_REVIEWS_WITH_TTA_SUPPORT,
};

/**
 * Compliant follow-up reviews, broken out by those with and without citations addressed by approved activity reports during the correction period.
 */
export default async function compliantFollowUpReviewsWithTtaSupport(
  scopes: IScopes
): Promise<ICompliantFollowUpReviewsWithTtaSupport> {
  // The grantCitation scope encodes both the grant filter and citation filters (e.g. finding type).
  // We extract grantIds to filter GrantDeliveredReviews and grantCitationIds to scope the citation
  // JOIN in the main SQL, so both filters flow in from a single source of truth.
  const grantCitations = await GrantCitation.findAll({
    attributes: ['id', 'grantId'],
    where: {
      [Op.and]: [...scopes.grantCitation],
    },
  });

  if (!grantCitations.length) {
    return EMPTY_RESULT;
  }

  const grantIds = uniq(grantCitations.map((gc: { grantId: number }) => gc.grantId));
  const grantCitationIds = grantCitations.map((gc: { id: number }) => gc.id);

  // Query completed delivered reviews matching the scope and grant filter to determine the date range.
  // We also capture ids so the SQL can filter to exactly the same set of reviews (encodes review_type
  // and any other deliveredReview scope filters that can't be passed as raw values to raw SQL).
  const deliveredReviews = await DeliveredReview.findAll({
    attributes: ['id', 'complete_date'],
    where: {
      [Op.and]: [
        ...scopes.deliveredReview,
        { complete: true },
        { complete_date: { [Op.gte]: MIN_MONITORING_DATE } },
      ],
    },
    include: [
      {
        model: GrantDeliveredReview,
        as: 'grantDeliveredReviews',
        required: true,
        attributes: [],
        where: { grantId: { [Op.in]: grantIds } },
      },
    ],
  });

  if (!deliveredReviews.length) {
    return EMPTY_RESULT;
  }

  const completeDates = deliveredReviews
    .map((dr: { id: number; complete_date: string }) => dr.complete_date)
    .sort();
  const deliveredReviewIds = deliveredReviews.map(
    (dr: { id: number; complete_date: string }) => dr.id
  );
  const seriesStart = moment(completeDates[0]).startOf('month').format('YYYY-MM-DD');
  const seriesEnd = moment(completeDates[completeDates.length - 1])
    .startOf('month')
    .format('YYYY-MM-DD');

  // Main query. Months are generated via generate_series so the result always covers the full range,
  // with zero-filled rows for months that have no matching reviews.
  // Citations are scoped via GrantCitations (gc_scoped.id IN :grantCitationIds), which encodes both
  // the grant association and any citation-level filters (e.g. finding type) from the grantCitation scope.
  const rows = await sequelize.query<IMonthlyCounts>(
    `WITH months AS (
      SELECT generate_series(:seriesStart::date, :seriesEnd::date, interval '1 month')::date AS month_start
    ),
    review_set AS (
      SELECT
        dr.id AS drid,
        months.month_start,
        bool_or(ar.id IS NOT NULL) AS has_tta
      FROM "GrantDeliveredReviews" gdr
      JOIN "DeliveredReviews" dr
        ON gdr."deliveredReviewId" = dr.id
      JOIN months
        ON dr.complete_date BETWEEN months.month_start AND months.month_start + INTERVAL '1 month' - INTERVAL '1 day'
      JOIN "DeliveredReviewCitations" drc
        ON dr.id = drc."deliveredReviewId"
      JOIN "GrantCitations" gc_scoped
        ON gc_scoped."citationId" = drc."citationId"
        AND gc_scoped.id IN (:grantCitationIds)
      JOIN "Citations" c
        ON c.id = gc_scoped."citationId"
        AND c."deletedAt" IS NULL
      LEFT JOIN "ActivityReportObjectiveCitations" aroc
        ON aroc."citationId" = c.id
      LEFT JOIN "ActivityReportObjectives" aro
        ON aroc."activityReportObjectiveId" = aro.id
      LEFT JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        AND ar."calculatedStatus" = 'approved'
        AND ar."startDate" BETWEEN dr.report_delivery_date AND dr.complete_date
      WHERE gdr."grantId" IN (:grantIds)
        AND dr.id IN (:deliveredReviewIds)
        AND dr."deletedAt" IS NULL
        AND dr.complete
      GROUP BY dr.id, months.month_start
    )
    SELECT
      TO_CHAR(m.month_start, 'YYYY-MM-DD') AS month_start,
      COUNT(rs.drid)::int AS total_reviews,
      COUNT(rs.drid) FILTER (WHERE rs.has_tta)::int AS with_tta,
      COUNT(rs.drid) FILTER (WHERE NOT rs.has_tta)::int AS without_tta
    FROM months m
    LEFT JOIN review_set rs ON rs.month_start = m.month_start
    GROUP BY 1
    ORDER BY 1;`,
    {
      replacements: {
        seriesStart,
        seriesEnd,
        grantIds,
        grantCitationIds,
        deliveredReviewIds,
      },
      type: QueryTypes.SELECT,
    }
  );

  return {
    name: 'Compliant Follow-up Reviews with TTA Support',
    months: rows.map((row: IMonthlyCounts) => moment(row.month_start).format('MMM YYYY')),
    reviews: [
      {
        name: 'Follow-up reviews with TTA',
        values: rows.map((row: IMonthlyCounts) => row.with_tta),
      },
      {
        name: 'Follow-up reviews without TTA',
        values: rows.map((row: IMonthlyCounts) => row.without_tta),
      },
      {
        name: 'Total',
        values: rows.map((row: IMonthlyCounts) => row.total_reviews),
      },
    ],
    id: TRACE_IDS.COMPLIANT_FOLLOW_UP_REVIEWS_WITH_TTA_SUPPORT,
  };
}
