import { TRACE_IDS } from '@ttahub/common';
import { uniq } from 'lodash';
import moment from 'moment';
import { Op, QueryTypes } from 'sequelize';
import db, { sequelize } from '../../models';
import type { IScopes } from '../types';
import { MIN_MONITORING_DATE } from './constants';

const { DeliveredReview, GrantCitation, GrantDeliveredReview } = db;

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

interface IGrantCitationScopeRecord {
  id: number;
  grantId: number;
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
  scopes: IScopes,
  _query?: Record<string, unknown>,
  scopedGrantCitations?: IGrantCitationScopeRecord[]
): Promise<ICompliantFollowUpReviewsWithTtaSupport> {
  // The grantCitation scope encodes both the grant filter and citation filters (e.g. finding type).
  // grantIds constrains the DeliveredReview query to relevant grants; grantCitationIds scopes the
  // citation JOIN in the main SQL. Both flow from a single source of truth.
  const grantCitations =
    scopedGrantCitations ??
    ((await GrantCitation.findAll({
      attributes: ['id', 'grantId'],
      where: {
        [Op.and]: [...scopes.grantCitation],
      },
      raw: true,
    })) as IGrantCitationScopeRecord[]);

  if (!grantCitations.length) {
    return EMPTY_RESULT;
  }

  const grantIds = uniq(grantCitations.map((gc: { grantId: number }) => gc.grantId));
  const grantCitationIds = grantCitations.map((gc: { id: number }) => gc.id);

  // Apply the deliveredReview scope (e.g. review_type) and grant filter via the ORM, since
  // WhereOptions can't be injected into raw SQL. The resulting ids are passed to the SQL where
  // scoped_reviews re-fetches the necessary columns and drives the rest of the query.
  const deliveredReviews = await DeliveredReview.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [
        ...scopes.deliveredReview,
        { corrected: true },
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

  const deliveredReviewIds = deliveredReviews.map((dr: { id: number }) => dr.id);

  // Main query. scoped_reviews anchors the query to the pre-filtered review set; months are
  // derived from it via MIN/MAX so the result covers the full range with zero-filled rows.
  // Citations are scoped via GrantCitations (gc_scoped.id IN :grantCitationIds), which encodes
  // the grant association and any citation-level filters from the grantCitation scope.
  const rows = await sequelize.query<IMonthlyCounts>(
    `
    WITH scoped_reviews AS (
    SELECT
      id drid,
      complete_date,
      report_delivery_date
    FROM "DeliveredReviews"
    WHERE id IN (:deliveredReviewIds)
    ),
    scoped_review_citations AS (
    SELECT DISTINCT
      sr.drid,
      COALESCE(c.initial_review_uuid::text, c.finding_uuid::text, c.id::text) AS family_key,
      c.id AS citation_id,
      c.initial_report_delivery_date
    FROM scoped_reviews sr
    JOIN "DeliveredReviewCitations" drc
      ON sr.drid = drc."deliveredReviewId"
    JOIN "GrantCitations" gc_scoped
      ON gc_scoped."citationId" = drc."citationId"
      AND gc_scoped.id IN (:grantCitationIds)
    JOIN "Citations" c
      ON c.id = gc_scoped."citationId"
      AND c."deletedAt" IS NULL
    ),
    family_reviews AS (
    SELECT
      family_key,
      complete_date,
      report_delivery_date
    FROM (
      SELECT
        src.family_key,
        sr.complete_date,
        sr.report_delivery_date,
        ROW_NUMBER() OVER (
          PARTITION BY src.family_key
          ORDER BY sr.complete_date DESC NULLS LAST, sr.report_delivery_date DESC NULLS LAST, sr.drid DESC
        ) AS row_number
      FROM scoped_reviews sr
      JOIN (
        SELECT DISTINCT drid, family_key
        FROM scoped_review_citations
      ) src
        ON src.drid = sr.drid
    ) ranked_family_reviews
    WHERE row_number = 1
    ),
    months AS (
    SELECT
    generate_series(
      DATE_TRUNC('month', MIN(complete_date))::date,
      DATE_TRUNC('month', MAX(complete_date))::date,
      interval '1 month'
    )::date AS month_start
    FROM family_reviews
    ),
    review_set AS (
    SELECT
      fr.family_key,
      m.month_start,
      bool_or(ar.id IS NOT NULL) AS has_tta
    FROM family_reviews fr
    JOIN months m
      ON fr.complete_date BETWEEN m.month_start AND m.month_start + INTERVAL '1 month' - INTERVAL '1 day'
    JOIN scoped_review_citations src
      ON src.family_key = fr.family_key
    LEFT JOIN "ActivityReportObjectiveCitations" aroc
      ON aroc."citationId" = src.citation_id
      AND aroc."grantId" IN (:grantIds)
    LEFT JOIN "ActivityReportObjectives" aro
      ON aroc."activityReportObjectiveId" = aro.id
    LEFT JOIN "ActivityReports" ar
      ON aro."activityReportId" = ar.id
      AND ar."calculatedStatus" = 'approved'
      AND ar."submissionStatus" <> 'deleted'
      AND src.initial_report_delivery_date IS NOT NULL
      AND ar."endDate" > src.initial_report_delivery_date
      AND ar."endDate" < fr.report_delivery_date
    GROUP BY 1,2
    )
    SELECT
      TO_CHAR(m.month_start, 'YYYY-MM-DD') AS month_start,
      COUNT(rs.family_key)::int AS total_reviews,
      COUNT(rs.family_key) FILTER (WHERE rs.has_tta)::int AS with_tta,
      COUNT(rs.family_key) FILTER (WHERE NOT rs.has_tta)::int AS without_tta
    FROM months m
    LEFT JOIN review_set rs ON rs.month_start = m.month_start
    GROUP BY 1
    ORDER BY 1;`,
    {
      replacements: {
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
