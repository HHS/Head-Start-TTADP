/* eslint-disable max-len */
import { Op } from 'sequelize';
import db, { sequelize } from '../../models';
import { REPORT_STATUSES } from '../../scopes/activityReport/testHelpers';
import { IScopes } from '../types';

const {
  ActivityReport,
  Grant,
  DeliveredReview,
  ActivityReportObjective,
  Citation,
  GrantCitation,
} = db;

interface MonitoringOverviewData {
  percentCompliantFollowUpReviewsWithTtaSupport: string;
  totalCompliantFollowUpReviewsWithTtaSupport: string;
  totalCompliantFollowUpReviews: string;
  percentActiveDeficientCitationsWithTtaSupport: string;
  totalActiveDeficientCitationsWithTtaSupport: string;
  totalActiveDeficientCitations: string;
  percentActiveNoncompliantCitationsWithTtaSupport: string;
  totalActiveNoncompliantCitationsWithTtaSupport: string;
  totalActiveNoncompliantCitations: string;
}

export default async function monitoringOverview(
  scopes: IScopes,
) : Promise<MonitoringOverviewData> {
  const deliveredReviews = await DeliveredReview.findAll({
    where: {
      [Op.and]: [
        ...scopes.deliveredReview,
        { outcome: 'Compliant' },
        { review_type: 'Follow-up' },
      ],
    },
    group: ['DeliveredReview.id'],
    attributes: [
      'id',
      [sequelize.literal(`CASE WHEN SUM(CASE WHEN "citations->activityReportObjectives->activityReport"."calculatedStatus" = '${REPORT_STATUSES.APPROVED}' THEN 1 ELSE 0 END) > 0 THEN true ELSE false END`), 'hasTtaSupport'],
    ],
    include: [
      {
        model: Citation,
        as: 'citations',
        required: false,
        attributes: [],
        through: {
          attributes: [],
        },
        include: [
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            required: false,
            attributes: [],
            through: {
              attributes: [],
            },
            include: [
              {
                model: ActivityReport,
                as: 'activityReport',
                required: false,
                attributes: [],
                where: {
                  [Op.and]: [
                    ...scopes.activityReport,
                    { calculatedStatus: REPORT_STATUSES.APPROVED },
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        // we don't want recipients included
        model: Grant.unscoped(),
        as: 'grants',
        required: true,
        attributes: [],
        where: scopes.grant.where,
        through: {
          attributes: [],
        },
      },
    ],
    // raw since this an aggregate query
    raw: true,
  }) as {
    id: number;
    hasTtaSupport: boolean;
  }[];

  /**
   * TODO: Remove before merging
   * SQL Generated, for code review (given default scopes + all regions)
   *
      SELECT
          "DeliveredReview"."id",
          CASE
              WHEN SUM(
                  CASE
                      WHEN "citations->activityReportObjectives->activityReport"."calculatedStatus" = 'approved' THEN 1
                      ELSE 0
                  END
              ) > 0 THEN true
              ELSE false
          END AS "_0"
      FROM
          "DeliveredReviews" AS "DeliveredReview"
          LEFT OUTER JOIN (
              "DeliveredReviewCitations" AS "citations->DeliveredReviewCitation"
              INNER JOIN "Citations" AS "citations" ON "citations"."id" = "citations->DeliveredReviewCitation"."citationId"
          ) ON "DeliveredReview"."id" = "citations->DeliveredReviewCitation"."deliveredReviewId"
          AND ("citations"."deletedAt" IS NULL)
          LEFT OUTER JOIN (
              "ActivityReportObjectiveCitations" AS "citations->activityReportObjectives->ActivityReportObjectiveCitation"
              INNER JOIN "ActivityReportObjectives" AS "citations->activityReportObjectives" ON "citations->activityReportObjectives"."id" = "citations->activityReportObjectives->ActivityReportObjectiveCitation"."activityReportObjectiveId"
          ) ON "citations"."id" = "citations->activityReportObjectives->ActivityReportObjectiveCitation"."citationId"
          LEFT OUTER JOIN "ActivityReports" AS "citations->activityReportObjectives->activityReport" ON "citations->activityReportObjectives"."activityReportId" = "citations->activityReportObjectives->activityReport"."id"
          AND (
              "citations->activityReportObjectives->activityReport"."regionId" IN (
                  '1',
                  '2',
                  '3',
                  '4',
                  '5',
                  '6',
                  '7',
                  '8',
                  '9',
                  '10',
                  '11',
                  '12'
              )
              AND (
                  (
                      (
                          "citations->activityReportObjectives->activityReport"."startDate" >= '2025-03-31'
                          AND "citations->activityReportObjectives->activityReport"."startDate" <= '2026-03-31'
                      )
                  )
              )
              AND "citations->activityReportObjectives->activityReport"."calculatedStatus" = 'approved'
          )
          AND "citations->activityReportObjectives->activityReport"."submissionStatus" != 'deleted'
          INNER JOIN (
              "GrantDeliveredReviews" AS "grants->GrantDeliveredReview"
              INNER JOIN "Grants" AS "grants" ON "grants"."id" = "grants->GrantDeliveredReview"."grantId"
          ) ON "DeliveredReview"."id" = "grants->GrantDeliveredReview"."deliveredReviewId"
          AND (
              "grants"."regionId" IN (
                  '1',
                  '2',
                  '3',
                  '4',
                  '5',
                  '6',
                  '7',
                  '8',
                  '9',
                  '10',
                  '11',
                  '12'
              )
              AND (
                  (
                      (
                          "grants"."inactivationDate" >= '2025-03-31 00:00:00.000 +00:00'
                          OR "grants"."inactivationDate" IS NULL
                      )
                      AND "grants"."startDate" <= '2026-03-31 00:00:00.000 +00:00'
                      AND "grants"."endDate" >= '2025-03-31 00:00:00.000 +00:00'
                  )
              )
          )
      WHERE
          (
              "DeliveredReview"."deletedAt" IS NULL
              AND (
                  (
                      (
                          (
                              "DeliveredReview"."report_delivery_date" >= '2025-03-31'
                              AND "DeliveredReview"."report_delivery_date" <= '2026-03-31'
                          )
                      )
                  )
                  AND "DeliveredReview"."outcome" = 'Compliant'
                  AND "DeliveredReview"."review_type" = 'Follow-up'
              )
          )
      GROUP BY
          "DeliveredReview"."id";
   *
   *
   */

  const totalCompliantFollowUpReviews = deliveredReviews.length;
  const totalCompliantFollowUpReviewsWithTtaSupport = deliveredReviews.filter((review: typeof deliveredReviews[number]) => review.hasTtaSupport).length;

  const percentCompliantFollowUpReviewsWithTtaSupport = (() => {
    if (totalCompliantFollowUpReviews === 0) {
      return '0%';
    }
    const percent = 100 * (totalCompliantFollowUpReviewsWithTtaSupport / totalCompliantFollowUpReviews);
    return `${percent.toFixed(2)}%`;
  })();

  const activeDeficientNoncompliantCitations = await Citation.findAll({
    attributes: [
      'id',
      'calculated_finding_type',
      [sequelize.literal(`CASE WHEN SUM(CASE WHEN "activityReportObjectives->activityReport"."calculatedStatus" = '${REPORT_STATUSES.APPROVED}' THEN 1 ELSE 0 END) > 0 THEN true ELSE false END`), 'hasTtaSupport'],
    ],
    group: [
      sequelize.col('calculated_finding_type'),
      sequelize.col('Citation.id'),
    ],
    // raw since this an aggregate query
    raw: true,
    where: {
      [Op.and]: [
        ...scopes.citation,
        {
          active: true,
        },
        {
          calculated_finding_type: {
            [Op.in]: ['Deficiency', 'Noncompliance'],
          },
        },
      ],
    },
    include: [
      {
        // we don't want recipients included
        model: Grant.unscoped(),
        as: 'grants',
        required: true,
        attributes: [],
        through: {
          attributes: [],
        },
        where: scopes.grant.where,
      },
      {
        model: ActivityReportObjective,
        as: 'activityReportObjectives',
        required: false,
        attributes: [],
        through: {
          attributes: [],
        },
        include: [
          {
            model: ActivityReport,
            as: 'activityReport',
            required: false,
            attributes: [],
            where: {
              [Op.and]: [
                ...scopes.activityReport,
                { calculatedStatus: REPORT_STATUSES.APPROVED },
              ],
            },
          },
        ],
      },
    ],
  }) as {
    id: number;
    calculated_finding_type: 'Deficiency' | 'Noncompliance';
    hasTtaSupport: boolean;
  }[];

  /**
   * TODO: Remove before merging
   * SQL Generated, for code review (given default scopes + all regions)
    SELECT
        "Citation"."id",
        "Citation"."calculated_finding_type",
        CASE
            WHEN SUM(
                CASE
                    WHEN "activityReportObjectives->activityReport"."calculatedStatus" = 'approved' THEN 1
                    ELSE 0
                END
            ) > 0 THEN true
            ELSE false
        END AS "_0"
    FROM
        "Citations" AS "Citation"
        INNER JOIN (
            "GrantCitations" AS "grants->GrantCitation"
            INNER JOIN "Grants" AS "grants" ON "grants"."id" = "grants->GrantCitation"."grantId"
        ) ON "Citation"."id" = "grants->GrantCitation"."citationId"
        AND (
            "grants"."regionId" IN (
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                '10',
                '11',
                '12'
            )
            AND (
                (
                    (
                        "grants"."inactivationDate" >= '2025-03-31 00:00:00.000 +00:00'
                        OR "grants"."inactivationDate" IS NULL
                    )
                    AND "grants"."startDate" <= '2026-03-31 00:00:00.000 +00:00'
                    AND "grants"."endDate" >= '2025-03-31 00:00:00.000 +00:00'
                )
            )
        )
        LEFT OUTER JOIN (
            "ActivityReportObjectiveCitations" AS "activityReportObjectives->ActivityReportObjectiveCitation"
            INNER JOIN "ActivityReportObjectives" AS "activityReportObjectives" ON "activityReportObjectives"."id" = "activityReportObjectives->ActivityReportObjectiveCitation"."activityReportObjectiveId"
        ) ON "Citation"."id" = "activityReportObjectives->ActivityReportObjectiveCitation"."citationId"
        LEFT OUTER JOIN "ActivityReports" AS "activityReportObjectives->activityReport" ON "activityReportObjectives"."activityReportId" = "activityReportObjectives->activityReport"."id"
        AND (
            "activityReportObjectives->activityReport"."regionId" IN (
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                '10',
                '11',
                '12'
            )
            AND (
                (
                    (
                        "activityReportObjectives->activityReport"."startDate" >= '2025-03-31'
                        AND "activityReportObjectives->activityReport"."startDate" <= '2026-03-31'
                    )
                )
            )
            AND "activityReportObjectives->activityReport"."calculatedStatus" = 'approved'
        )
        AND "activityReportObjectives->activityReport"."submissionStatus" != 'deleted'
    WHERE
        (
            "Citation"."deletedAt" IS NULL
            AND (
                (
                    (
                        "Citation"."initial_report_delivery_date" <= '2026-03-31'
                        AND "Citation"."active_through" >= '2025-03-31'
                    )
                )
                AND "Citation"."active" = true
                AND "Citation"."calculated_finding_type" IN ('Deficiency', 'Noncompliance')
            )
        )
    GROUP BY
        "calculated_finding_type",
        "Citation"."id";
   */

  const activeDeficientCitations = activeDeficientNoncompliantCitations.filter((citation: typeof activeDeficientNoncompliantCitations[number]) => citation.calculated_finding_type === 'Deficiency');
  const activeNoncompliantCitations = activeDeficientNoncompliantCitations.filter((citation: typeof activeDeficientNoncompliantCitations[number]) => citation.calculated_finding_type === 'Noncompliance');

  const totalActiveDeficientCitations = activeDeficientCitations.length;
  const totalActiveDeficientCitationsWithTtaSupport = activeDeficientCitations.filter((citation: typeof activeDeficientCitations[number]) => citation.hasTtaSupport).length;
  const percentActiveDeficientCitationsWithTtaSupport = (() => {
    if (totalActiveDeficientCitations === 0) {
      return '0%';
    }
    const percent = 100 * (totalActiveDeficientCitationsWithTtaSupport / totalActiveDeficientCitations);
    return `${percent.toFixed(2)}%`;
  })();

  const totalActiveNoncompliantCitations = activeNoncompliantCitations.length;
  const totalActiveNoncompliantCitationsWithTtaSupport = activeNoncompliantCitations.filter((citation: typeof activeNoncompliantCitations[number]) => citation.hasTtaSupport).length;
  const percentActiveNoncompliantCitationsWithTtaSupport = (() => {
    if (totalActiveNoncompliantCitations === 0) {
      return '0%';
    }
    const percent = 100 * (totalActiveNoncompliantCitationsWithTtaSupport / totalActiveNoncompliantCitations);
    return `${percent.toFixed(2)}%`;
  })();

  return {
    percentCompliantFollowUpReviewsWithTtaSupport,
    totalCompliantFollowUpReviewsWithTtaSupport: totalCompliantFollowUpReviewsWithTtaSupport.toString(),
    totalCompliantFollowUpReviews: totalCompliantFollowUpReviews.toString(),
    percentActiveDeficientCitationsWithTtaSupport,
    totalActiveDeficientCitationsWithTtaSupport: totalActiveDeficientCitationsWithTtaSupport.toString(),
    totalActiveDeficientCitations: totalActiveDeficientCitations.toString(),
    percentActiveNoncompliantCitationsWithTtaSupport,
    totalActiveNoncompliantCitationsWithTtaSupport: totalActiveNoncompliantCitationsWithTtaSupport.toString(),
    totalActiveNoncompliantCitations: totalActiveNoncompliantCitations.toString(),
  };
}
