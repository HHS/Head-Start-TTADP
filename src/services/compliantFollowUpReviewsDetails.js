import { uniq } from 'lodash';
import { Op, QueryTypes } from 'sequelize';
import db, { sequelize } from '../models';
import { MIN_MONITORING_DATE } from '../widgets/monitoring/constants';

const { DeliveredReview, GrantCitation, GrantDeliveredReview } = db;

/**
 * Returns details for compliant follow-up reviews scoped to the current dashboard filters.
 * A review is considered compliant when DeliveredReview.corrected = true.
 *
 * @param {import('../widgets/types').IScopes} scopes
 * @returns {Promise<Array<{
 *   reviewId: number,
 *   reviewName: string | null,
 *   recipientId: number | null,
 *   regionId: number | null,
 *   recipientName: string | null,
 *   grantsOnReview: string[],
 *   citationNumbers: string[],
 *   hasTta: boolean,
 *   lastTtaDate: string | null,
 *   associatedActivityReports: number[],
 *   compliantFollowUpReviewReceivedDate: string | null,
 *   initialReviews: Array<{
 *     reviewId: number | null,
 *     reviewName: string | null,
 *     reviewReceivedDate: string | null,
 *   }>,
 * }>>}
 */
export default async function compliantFollowUpReviewsDetails(scopes) {
  const grantCitations = await GrantCitation.findAll({
    attributes: ['id', 'grantId'],
    where: {
      [Op.and]: [...scopes.grantCitation],
    },
  });

  if (!grantCitations.length) {
    return [];
  }

  const grantIds = uniq(grantCitations.map((gc) => gc.grantId));
  const grantCitationIds = grantCitations.map((gc) => gc.id);

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
    return [];
  }

  const deliveredReviewIds = deliveredReviews.map((dr) => dr.id);

  const rows = await sequelize.query(
    `WITH scoped_reviews AS (
			SELECT
				dr.id,
				dr.mrid,
				dr.review_name,
				dr.report_delivery_date,
				dr.complete_date
			FROM "DeliveredReviews" dr
			WHERE dr.id IN (:deliveredReviewIds)
		),
		scoped_review_citations AS (
			SELECT DISTINCT
				sr.id AS delivered_review_id,
				c.id AS citation_id,
				c.citation,
				c.initial_review_uuid,
				c.initial_report_delivery_date
			FROM scoped_reviews sr
			JOIN "DeliveredReviewCitations" drc
				ON drc."deliveredReviewId" = sr.id
			JOIN "GrantCitations" gc_scoped
				ON gc_scoped."citationId" = drc."citationId"
				AND gc_scoped.id IN (:grantCitationIds)
			JOIN "Citations" c
				ON c.id = gc_scoped."citationId"
				AND c."deletedAt" IS NULL
		),
		citation_rollup AS (
			SELECT
				src.delivered_review_id,
				ARRAY_REMOVE(ARRAY_AGG(DISTINCT src.citation ORDER BY src.citation), NULL) AS citation_numbers
			FROM scoped_review_citations src
			GROUP BY src.delivered_review_id
		),
		initial_review_rows AS (
			SELECT
				src.delivered_review_id,
				idr.mrid AS review_id,
				idr.review_name,
				MIN(src.initial_report_delivery_date) AS review_received_date
			FROM scoped_review_citations src
			LEFT JOIN "DeliveredReviews" idr
				ON idr.review_uuid = src.initial_review_uuid
				AND idr."deletedAt" IS NULL
			GROUP BY src.delivered_review_id, src.initial_review_uuid, idr.mrid, idr.review_name
		),
		initial_review_rollup AS (
			SELECT
				delivered_review_id,
				JSONB_AGG(
					JSONB_BUILD_OBJECT(
						'reviewId', review_id,
						'reviewName', review_name,
						'reviewReceivedDate', TO_CHAR(review_received_date, 'YYYY-MM-DD')
					)
					ORDER BY review_received_date NULLS LAST, review_id NULLS LAST, review_name NULLS LAST
				) FILTER (
					WHERE review_id IS NOT NULL
						OR review_name IS NOT NULL
						OR review_received_date IS NOT NULL
				) AS initial_reviews
			FROM initial_review_rows
			GROUP BY delivered_review_id
		),
		grant_rollup AS (
			SELECT
				sr.id AS delivered_review_id,
				MAX(g."recipientId") AS recipient_id,
				MAX(g."regionId") AS region_id,
				MAX(gdr.recipient_name) AS recipient_name, -- as there is only one recipient per grant, this is safe to do
				ARRAY_REMOVE(ARRAY_AGG(DISTINCT g.number ORDER BY g.number), NULL) AS grants_on_review
			FROM scoped_reviews sr
			JOIN "GrantDeliveredReviews" gdr
				ON gdr."deliveredReviewId" = sr.id
				AND gdr."grantId" IN (:grantIds)
			JOIN "Grants" g
				ON g.id = gdr."grantId"
			GROUP BY sr.id
		),
		tta_rollup AS (
			SELECT
				sr.id AS delivered_review_id,
				(COUNT(DISTINCT ar.id) > 0) AS has_tta,
				MAX(ar."endDate")::date AS last_tta_date,
				ARRAY_REMOVE(ARRAY_AGG(DISTINCT ar.id ORDER BY ar.id), NULL) AS associated_activity_reports
			FROM scoped_reviews sr
			JOIN scoped_review_citations src
				ON src.delivered_review_id = sr.id
			LEFT JOIN "ActivityReportObjectiveCitations" aroc
				ON aroc."citationId" = src.citation_id
        AND aroc."grantId" IN (:grantIds)
			LEFT JOIN "ActivityReportObjectives" aro
				ON aro.id = aroc."activityReportObjectiveId"
			LEFT JOIN "ActivityReports" ar
				ON ar.id = aro."activityReportId"
				AND ar."calculatedStatus" = 'approved'
				AND ar."submissionStatus" <> 'deleted'
				AND src.initial_report_delivery_date IS NOT NULL
				AND ar."endDate" > src.initial_report_delivery_date
				AND ar."endDate" < sr.report_delivery_date
			GROUP BY sr.id
		)
		SELECT
			sr.mrid AS review_id,
			sr.review_name,
			gr.recipient_id,
			gr.region_id,
			gr.recipient_name,
			gr.grants_on_review,
			cr.citation_numbers,
			tr.has_tta,
			TO_CHAR(tr.last_tta_date, 'YYYY-MM-DD') AS last_tta_date,
			tr.associated_activity_reports,
			TO_CHAR(sr.report_delivery_date, 'YYYY-MM-DD') AS compliant_follow_up_review_received_date,
			COALESCE(irr.initial_reviews, '[]'::jsonb) AS initial_reviews
		FROM scoped_reviews sr
		JOIN citation_rollup cr
			ON cr.delivered_review_id = sr.id
		LEFT JOIN initial_review_rollup irr
			ON irr.delivered_review_id = sr.id
		LEFT JOIN grant_rollup gr
			ON gr.delivered_review_id = sr.id
		LEFT JOIN tta_rollup tr
			ON tr.delivered_review_id = sr.id
		ORDER BY sr.complete_date DESC NULLS LAST, sr.id DESC;`,
    {
      replacements: {
        deliveredReviewIds,
        grantCitationIds,
        grantIds,
      },
      type: QueryTypes.SELECT,
    }
  );

  return rows.map((row) => ({
    reviewId: row.review_id,
    reviewName: row.review_name,
    recipientId: row.recipient_id,
    regionId: row.region_id,
    recipientName: row.recipient_name,
    grantsOnReview: row.grants_on_review || [],
    citationNumbers: row.citation_numbers || [],
    hasTta: Boolean(row.has_tta),
    lastTtaDate: row.last_tta_date,
    associatedActivityReports: row.associated_activity_reports || [],
    compliantFollowUpReviewReceivedDate: row.compliant_follow_up_review_received_date,
    initialReviews: Array.isArray(row.initial_reviews) ? row.initial_reviews : [],
  }));
}
