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
  const grants = await Grant.unscoped().findAll({
    attributes: ['id'],
    where: scopes.grant.where,
  });

  // get all delivered reviews given the scopes
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

  console.log({ citationScopes: JSON.stringify(scopes.citation, null, 2) });

  const activeDeficientNoncompliantCitations = await Citation.findAll({
    logging: console.log,
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
        model: Grant,
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
