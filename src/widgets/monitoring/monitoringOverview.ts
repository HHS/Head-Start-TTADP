/* eslint-disable max-len */

import { REPORT_STATUSES } from '@ttahub/common';
import { uniq } from 'lodash';
import moment from 'moment';
import { Op, QueryTypes } from 'sequelize';
import db, { sequelize } from '../../models';
import type { IScopes } from '../types';
import compliantFollowUpReviewsWithTtaSupport from './compliantFollowUpReviewsWithTtaSupport';
import { MIN_MONITORING_DATE } from './constants';

const REPORT_DATE_INPUT_FORMATS = ['YYYY-MM-DD', 'MM/DD/YYYY', moment.ISO_8601];

const {
  ActivityReport,
  ActivityReportObjectiveCitation,
  GrantCitation,
  ActivityReportObjective,
  Citation,
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

export default async function monitoringOverview(scopes: IScopes): Promise<MonitoringOverviewData> {
  // Derive grant/citation scope first — used by both delivered-review and citation queries
  const grantCitations = (await GrantCitation.findAll({
    attributes: ['citationId', 'grantId', 'id'],
    where: {
      [Op.and]: [...scopes.grantCitation],
    },
    raw: true,
  })) as { id: number; citationId: number; grantId: number }[];

  const citationIds = grantCitations.map((gc) => gc.citationId);

  if (!citationIds.length) {
    return {
      percentCompliantFollowUpReviewsWithTtaSupport: '0%',
      totalCompliantFollowUpReviewsWithTtaSupport: '0',
      totalCompliantFollowUpReviews: '0',
      percentActiveDeficientCitationsWithTtaSupport: '0%',
      totalActiveDeficientCitationsWithTtaSupport: '0',
      totalActiveDeficientCitations: '0',
      percentActiveNoncompliantCitationsWithTtaSupport: '0%',
      totalActiveNoncompliantCitationsWithTtaSupport: '0',
      totalActiveNoncompliantCitations: '0',
    };
  }

  const compliantFollowUpData = await compliantFollowUpReviewsWithTtaSupport(
    scopes,
    grantCitations
  );
  const totalCompliantFollowUpReviews =
    compliantFollowUpData.reviews
      .find((series) => series.name === 'Total')
      ?.values.reduce((total, count) => total + count, 0) ?? 0;
  const totalCompliantFollowUpReviewsWithTtaSupport =
    compliantFollowUpData.reviews
      .find((series) => series.name === 'Follow-up reviews with TTA')
      ?.values.reduce((total, count) => total + count, 0) ?? 0;

  const percentCompliantFollowUpReviewsWithTtaSupport = (() => {
    if (totalCompliantFollowUpReviews === 0) {
      return '0%';
    }
    const percent =
      100 * (totalCompliantFollowUpReviewsWithTtaSupport / totalCompliantFollowUpReviews);
    return `${percent.toFixed(2)}%`;
  })();

  const approvedReports = (await ActivityReport.findAll({
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
  })) as { id: number; startDate: string }[];

  const months = uniq(
    approvedReports.map((report: (typeof approvedReports)[number]) =>
      moment(report.startDate as string, REPORT_DATE_INPUT_FORMATS, true)
        .startOf('month')
        .format('YYYY-MM-DD')
    )
  ).sort() as string[];

  const approvedReportIds = uniq(
    approvedReports.map((report: (typeof approvedReports)[number]) => report.id as number)
  );

  let totalActiveDeficientCitations = 0;
  let totalActiveDeficientCitationsWithTtaSupport = 0;
  let totalActiveNoncompliantCitations = 0;
  let totalActiveNoncompliantCitationsWithTtaSupport = 0;

  if (months.length) {
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
        WHERE gc."id" IN (:grantCitationIds)
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
          AND gc."id" IN (:grantCitationIds)
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
          approvedReportIds,
          grantCitationIds: grantCitations.map((gc) => gc.id),
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
