/* eslint-disable max-len */

import { REPORT_STATUSES } from '@ttahub/common';
import { Op } from 'sequelize';
import db, { sequelize } from '../../models';
import type { IScopes } from '../types';

const { ActivityReport, Grant, DeliveredReview, ActivityReportObjective, Citation } = db;

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

export default async function monitoringOverview(scopes: IScopes): Promise<MonitoringOverviewData> {
  const [deliveredReviewCounts] = (await DeliveredReview.findAll({
    where: {
      [Op.and]: [...scopes.deliveredReview, { outcome: 'Compliant' }, { review_type: 'Follow-up' }],
    },
    attributes: [
      [
        sequelize.literal('COUNT(DISTINCT "DeliveredReview"."id")'),
        'totalCompliantFollowUpReviews',
      ],
      [
        sequelize.literal(
          'COUNT(DISTINCT CASE WHEN "citations->activityReportObjectives->activityReport"."id" IS NOT NULL THEN "DeliveredReview"."id" END)'
        ),
        'totalCompliantFollowUpReviewsWithTtaSupport',
      ],
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
                  [Op.and]: [{ calculatedStatus: REPORT_STATUSES.APPROVED }],
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
  })) as {
    totalCompliantFollowUpReviews: string;
    totalCompliantFollowUpReviewsWithTtaSupport: string;
  }[];

  const totalCompliantFollowUpReviews = Number(
    deliveredReviewCounts?.totalCompliantFollowUpReviews ?? 0
  );
  const totalCompliantFollowUpReviewsWithTtaSupport = Number(
    deliveredReviewCounts?.totalCompliantFollowUpReviewsWithTtaSupport ?? 0
  );

  const percentCompliantFollowUpReviewsWithTtaSupport = (() => {
    if (totalCompliantFollowUpReviews === 0) {
      return '0%';
    }
    const percent =
      100 * (totalCompliantFollowUpReviewsWithTtaSupport / totalCompliantFollowUpReviews);
    return `${percent.toFixed(2)}%`;
  })();

  const [citationCounts] = (await Citation.findAll({
    attributes: [
      [
        sequelize.literal(
          'COUNT(DISTINCT CASE WHEN "Citation"."calculated_finding_type" = \'Deficiency\' THEN "Citation"."id" END)'
        ),
        'totalActiveDeficientCitations',
      ],
      [
        sequelize.literal(
          'COUNT(DISTINCT CASE WHEN "Citation"."calculated_finding_type" = \'Deficiency\' AND "activityReportObjectives->activityReport"."id" IS NOT NULL THEN "Citation"."id" END)'
        ),
        'totalActiveDeficientCitationsWithTtaSupport',
      ],
      [
        sequelize.literal(
          'COUNT(DISTINCT CASE WHEN "Citation"."calculated_finding_type" = \'Noncompliance\' THEN "Citation"."id" END)'
        ),
        'totalActiveNoncompliantCitations',
      ],
      [
        sequelize.literal(
          'COUNT(DISTINCT CASE WHEN "Citation"."calculated_finding_type" = \'Noncompliance\' AND "activityReportObjectives->activityReport"."id" IS NOT NULL THEN "Citation"."id" END)'
        ),
        'totalActiveNoncompliantCitationsWithTtaSupport',
      ],
    ],
    // raw since this an aggregate query
    raw: true,
    where: {
      [Op.and]: [
        ...scopes.citation,
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
              [Op.and]: [...scopes.activityReport, { calculatedStatus: REPORT_STATUSES.APPROVED }],
            },
          },
        ],
      },
    ],
  })) as {
    totalActiveDeficientCitations: string;
    totalActiveDeficientCitationsWithTtaSupport: string;
    totalActiveNoncompliantCitations: string;
    totalActiveNoncompliantCitationsWithTtaSupport: string;
  }[];

  const totalActiveDeficientCitations = Number(citationCounts?.totalActiveDeficientCitations ?? 0);
  const totalActiveDeficientCitationsWithTtaSupport = Number(
    citationCounts?.totalActiveDeficientCitationsWithTtaSupport ?? 0
  );
  const percentActiveDeficientCitationsWithTtaSupport = (() => {
    if (totalActiveDeficientCitations === 0) {
      return '0%';
    }
    const percent =
      100 * (totalActiveDeficientCitationsWithTtaSupport / totalActiveDeficientCitations);
    return `${percent.toFixed(2)}%`;
  })();

  const totalActiveNoncompliantCitations = Number(
    citationCounts?.totalActiveNoncompliantCitations ?? 0
  );
  const totalActiveNoncompliantCitationsWithTtaSupport = Number(
    citationCounts?.totalActiveNoncompliantCitationsWithTtaSupport ?? 0
  );
  const percentActiveNoncompliantCitationsWithTtaSupport = (() => {
    if (totalActiveNoncompliantCitations === 0) {
      return '0%';
    }
    const percent =
      100 * (totalActiveNoncompliantCitationsWithTtaSupport / totalActiveNoncompliantCitations);
    return `${percent.toFixed(2)}%`;
  })();

  return {
    percentCompliantFollowUpReviewsWithTtaSupport,
    totalCompliantFollowUpReviewsWithTtaSupport:
      totalCompliantFollowUpReviewsWithTtaSupport.toString(),
    totalCompliantFollowUpReviews: totalCompliantFollowUpReviews.toString(),
    percentActiveDeficientCitationsWithTtaSupport,
    totalActiveDeficientCitationsWithTtaSupport:
      totalActiveDeficientCitationsWithTtaSupport.toString(),
    totalActiveDeficientCitations: totalActiveDeficientCitations.toString(),
    percentActiveNoncompliantCitationsWithTtaSupport,
    totalActiveNoncompliantCitationsWithTtaSupport:
      totalActiveNoncompliantCitationsWithTtaSupport.toString(),
    totalActiveNoncompliantCitations: totalActiveNoncompliantCitations.toString(),
  };
}
