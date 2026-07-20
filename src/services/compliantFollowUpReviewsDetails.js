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
 *   rowId: string,
 *   familyKey: string,
 *   reviewId: number,
 *   reviewName: string | null,
 *   recipientId: number | null,
 *   regionId: number | null,
 *   recipientName: string | null,
 *   grantsOnReview: string[],
 *   citationNumbers: string[],
 *   hasTta: boolean,
 *   lastTtaDate: string | null,
 *   associatedActivityReports: Array<{
 *     id: number,
 *     displayId: string,
 *     legacyId: string | null,
 *     regionId: number | null,
 *   }>,
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
    raw: true,
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
				COALESCE(c.initial_review_uuid::text, c.finding_uuid::text, c.id::text) AS family_key,
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
		family_review_ranked AS (
			SELECT
				src.family_key,
				sr.id AS delivered_review_id,
				sr.mrid,
				sr.review_name,
				sr.report_delivery_date,
				sr.complete_date,
				ROW_NUMBER() OVER (
					PARTITION BY src.family_key
					ORDER BY sr.complete_date DESC NULLS LAST, sr.report_delivery_date DESC NULLS LAST, sr.id DESC
				) AS row_number
			FROM scoped_reviews sr
			JOIN (
				SELECT DISTINCT delivered_review_id, family_key
				FROM scoped_review_citations
			) src
				ON src.delivered_review_id = sr.id
		),
		family_reviews AS (
			SELECT
				family_key,
				delivered_review_id,
				mrid,
				review_name,
				report_delivery_date,
				complete_date
			FROM family_review_ranked
			WHERE row_number = 1
		),
		grant_rollup_rows AS (
			SELECT
				src.family_key,
				g."recipientId" AS recipient_id,
				g."regionId" AS region_id,
				gdr.recipient_name,
				g.number AS grant_number
			FROM scoped_review_citations src
			JOIN scoped_reviews sr
				ON sr.id = src.delivered_review_id
			JOIN "GrantDeliveredReviews" gdr
				ON gdr."deliveredReviewId" = sr.id
				AND gdr."grantId" IN (:grantIds)
			JOIN "Grants" g
				ON g.id = gdr."grantId"
		),
		grant_rollup AS (
			SELECT
				family_key,
				CASE
					WHEN COUNT(DISTINCT (recipient_id, region_id)) = 1 THEN MAX(recipient_id)
					ELSE NULL
				END AS recipient_id,
				CASE
					WHEN COUNT(DISTINCT (recipient_id, region_id)) = 1 THEN MAX(region_id)
					ELSE NULL
				END AS region_id,
				CASE
					WHEN COUNT(DISTINCT (recipient_id, region_id)) = 1 THEN MAX(recipient_name)
					ELSE ARRAY_TO_STRING(ARRAY_REMOVE(ARRAY_AGG(DISTINCT recipient_name ORDER BY recipient_name), NULL), E'\n')
				END AS recipient_name,
				ARRAY_REMOVE(ARRAY_AGG(DISTINCT grant_number ORDER BY grant_number), NULL) AS grants_on_review
			FROM grant_rollup_rows
			GROUP BY family_key
		),
		citation_rollup AS (
			SELECT
				src.family_key,
				ARRAY_REMOVE(ARRAY_AGG(DISTINCT src.citation ORDER BY src.citation), NULL) AS citation_numbers
			FROM scoped_review_citations src
			GROUP BY src.family_key
		),
		initial_review_rows AS (
			SELECT
				src.family_key,
				idr.mrid AS review_id,
				idr.review_name,
				MIN(src.initial_report_delivery_date) AS review_received_date
			FROM scoped_review_citations src
			LEFT JOIN "DeliveredReviews" idr
				ON idr.review_uuid = src.initial_review_uuid
				AND idr."deletedAt" IS NULL
			GROUP BY src.family_key, src.initial_review_uuid, idr.mrid, idr.review_name
		),
		initial_review_rollup AS (
			SELECT
				family_key,
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
			GROUP BY family_key
		),
		tta_report_rows AS (
			SELECT DISTINCT
				fr.family_key,
				ar.id,
				ar."regionId" AS region_id,
				ar."legacyId" AS legacy_id,
				ar."endDate" AS end_date
			FROM family_reviews fr
			JOIN scoped_review_citations src
				ON src.family_key = fr.family_key
			JOIN "ActivityReportObjectiveCitations" aroc
				ON aroc."citationId" = src.citation_id
				AND aroc."grantId" IN (:grantIds)
			JOIN "ActivityReportObjectives" aro
				ON aro.id = aroc."activityReportObjectiveId"
			JOIN "ActivityReports" ar
				ON ar.id = aro."activityReportId"
				AND ar."calculatedStatus" = 'approved'
				AND ar."submissionStatus" <> 'deleted'
				AND src.initial_report_delivery_date IS NOT NULL
				AND ar."endDate" > src.initial_report_delivery_date
				AND ar."endDate" < fr.report_delivery_date
		),
		tta_rollup AS (
			SELECT
				fr.family_key,
				(COUNT(trr.id) > 0) AS has_tta,
				MAX(trr.end_date)::date AS last_tta_date,
				COALESCE(
					JSONB_AGG(
						JSONB_BUILD_OBJECT(
							'id', trr.id,
							'regionId', trr.region_id,
							'legacyId', trr.legacy_id,
							'displayId', COALESCE(
								trr.legacy_id,
								CASE
									WHEN trr.region_id IS NULL THEN CONCAT('???-AR-', trr.id::text)
									ELSE CONCAT('R', LPAD(trr.region_id::text, 2, '0'), '-AR-', trr.id::text)
								END
							)
						)
						ORDER BY trr.id
					) FILTER (WHERE trr.id IS NOT NULL),
					'[]'::jsonb
				) AS associated_activity_reports
			FROM family_reviews fr
			LEFT JOIN tta_report_rows trr
				ON trr.family_key = fr.family_key
			GROUP BY fr.family_key
		)
		SELECT
			CONCAT('cfu-family-', fr.family_key) AS row_id,
			fr.family_key,
			fr.mrid AS review_id,
			fr.review_name,
			gr.recipient_id,
			gr.region_id,
			gr.recipient_name,
			gr.grants_on_review,
			cr.citation_numbers,
			tr.has_tta,
			TO_CHAR(tr.last_tta_date, 'YYYY-MM-DD') AS last_tta_date,
			tr.associated_activity_reports,
			TO_CHAR(fr.report_delivery_date, 'YYYY-MM-DD') AS compliant_follow_up_review_received_date,
			COALESCE(irr.initial_reviews, '[]'::jsonb) AS initial_reviews
		FROM family_reviews fr
		JOIN citation_rollup cr
			ON cr.family_key = fr.family_key
		LEFT JOIN initial_review_rollup irr
			ON irr.family_key = fr.family_key
		LEFT JOIN grant_rollup gr
			ON gr.family_key = fr.family_key
		LEFT JOIN tta_rollup tr
			ON tr.family_key = fr.family_key
		ORDER BY fr.complete_date DESC NULLS LAST, fr.delivered_review_id DESC, fr.family_key ASC;`,
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
    rowId: row.row_id,
    familyKey: row.family_key,
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
