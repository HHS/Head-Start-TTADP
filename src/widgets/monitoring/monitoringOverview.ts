/* eslint-disable max-len */

import { REPORT_STATUSES } from '@ttahub/common';
import { uniq } from 'lodash';
import moment from 'moment';
import { Op, QueryTypes } from 'sequelize';
import db, { sequelize } from '../../models';
import type { IScopes } from '../types';

const {
  ActivityReport,
  ActivityRecipient,
  Grant,
  GrantCitation,
  DeliveredReview,
  ActivityReportObjective,
  Citation,
} = db;

const MIN_MONITORING_DATE = '2025-02-01';

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

  // Derive grants and months from approved activity reports (matches graph widget approach)
  const approvedReports = await ActivityReport.findAll({
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
        model: ActivityRecipient.unscoped(),
        as: 'activityRecipients',
        required: true,
        attributes: ['grantId'],
        where: { grantId: { [Op.not]: null } },
        include: [
          {
            model: Grant.unscoped(),
            attributes: [],
            required: true,
            as: 'grant',
            include: [
              {
                as: 'grantCitations',
                model: GrantCitation,
                attributes: [],
                required: true,
              },
            ],
          },
        ],
      },
    ],
  });

  const months = uniq(
    approvedReports.map((report: (typeof approvedReports)[number]) =>
      moment(report.getDataValue('startDate') as string)
        .startOf('month')
        .format('YYYY-MM-DD')
    )
  ).sort() as string[];

  const grantIds = uniq(
    approvedReports
      .flatMap(
        (report: (typeof approvedReports)[number]) =>
          report.getDataValue('activityRecipients') as { grantId: number }[]
      )
      .map((ar: { grantId: number }) => ar.grantId)
  );

  const approvedReportIds = uniq(
    approvedReports.map(
      (report: (typeof approvedReports)[number]) => report.getDataValue('id') as number
    )
  );

  let totalActiveDeficientCitations = 0;
  let totalActiveDeficientCitationsWithTtaSupport = 0;
  let totalActiveNoncompliantCitations = 0;
  let totalActiveNoncompliantCitationsWithTtaSupport = 0;

  if (months.length && grantIds.length) {
    const rangeStart = months[0];
    const rangeEnd = moment(months[months.length - 1])
      .add(1, 'month')
      .format('YYYY-MM-DD');

    const [citationCounts] = await sequelize.query<{
      totalActiveDeficientCitations: number;
      totalActiveDeficientCitationsWithTtaSupport: number;
      totalActiveNoncompliantCitations: number;
      totalActiveNoncompliantCitationsWithTtaSupport: number;
    }>(
      `WITH active_citations AS (
        SELECT DISTINCT c.id, c.calculated_finding_type
        FROM "GrantCitations" gc
        JOIN "Citations" c
          ON c.id = gc."citationId"
        WHERE gc."grantId" IN (:grantIds)
          AND c."calculated_finding_type" IN ('Deficiency', 'Noncompliance')
          AND c."deletedAt" IS NULL
          AND c.initial_report_delivery_date < :rangeEnd::date
          AND c.active_through >= :rangeStart::date
      ),
      tta_citations AS (
        SELECT DISTINCT c.id, c.calculated_finding_type
        FROM "ActivityReportObjectives" aro
        JOIN "ActivityReportObjectiveCitations" aroc
          ON aroc."activityReportObjectiveId" = aro.id
        JOIN "Citations" c
          ON c.id = aroc."citationId"
        JOIN "GrantCitations" gc
          ON gc."citationId" = c.id
        WHERE aro."activityReportId" IN (:approvedReportIds)
          AND gc."grantId" IN (:grantIds)
          AND c."calculated_finding_type" IN ('Deficiency', 'Noncompliance')
          AND c."deletedAt" IS NULL
          AND c.initial_report_delivery_date < :rangeEnd::date
          AND c.active_through >= :rangeStart::date
      )
      SELECT
        (SELECT COUNT(*) FROM active_citations WHERE calculated_finding_type = 'Deficiency')::int
          AS "totalActiveDeficientCitations",
        (SELECT COUNT(*) FROM tta_citations WHERE calculated_finding_type = 'Deficiency')::int
          AS "totalActiveDeficientCitationsWithTtaSupport",
        (SELECT COUNT(*) FROM active_citations WHERE calculated_finding_type = 'Noncompliance')::int
          AS "totalActiveNoncompliantCitations",
        (SELECT COUNT(*) FROM tta_citations WHERE calculated_finding_type = 'Noncompliance')::int
          AS "totalActiveNoncompliantCitationsWithTtaSupport"`,
      {
        replacements: {
          rangeStart,
          rangeEnd,
          grantIds,
          approvedReportIds,
        },
        type: QueryTypes.SELECT,
      }
    );

    totalActiveDeficientCitations = Number(citationCounts?.totalActiveDeficientCitations ?? 0);
    totalActiveDeficientCitationsWithTtaSupport = Number(
      citationCounts?.totalActiveDeficientCitationsWithTtaSupport ?? 0
    );
    totalActiveNoncompliantCitations = Number(
      citationCounts?.totalActiveNoncompliantCitations ?? 0
    );
    totalActiveNoncompliantCitationsWithTtaSupport = Number(
      citationCounts?.totalActiveNoncompliantCitationsWithTtaSupport ?? 0
    );
  }

  const percentActiveDeficientCitationsWithTtaSupport = (() => {
    if (totalActiveDeficientCitations === 0) {
      return '0%';
    }
    const percent =
      100 * (totalActiveDeficientCitationsWithTtaSupport / totalActiveDeficientCitations);
    return `${percent.toFixed(2)}%`;
  })();

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
