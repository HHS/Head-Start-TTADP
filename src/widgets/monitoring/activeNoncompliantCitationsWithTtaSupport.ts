import { REPORT_STATUSES, TRACE_IDS } from '@ttahub/common';
import { uniq } from 'lodash';
import moment from 'moment';
import { Op, QueryTypes } from 'sequelize';
import db, { sequelize } from '../../models';
import { buildContinuousMonths } from '../../scopes/utils';
import type { IScopes } from '../types';

const { ActivityReport, ActivityRecipient, Grant, GrantCitation } = db;

interface IActiveNoncompliantCitationsWithTtaSupport {
  name: 'Active areas of noncompliance with TTA support' | 'All active areas of noncompliance';
  x: string[];
  y: number[];
  month: string[];
  id: string;
  trace: 'circle' | 'triangle';
}

interface IMonthlyCounts {
  month_start: string;
  noncompliance_with_tta: number;
  total_active_noncompliance: number;
}

type MonthCountByMonthStart = Map<string, IMonthlyCounts>;

/**
 * Returns monthly traces for active areas of noncompliance and active areas of noncompliance with TTA support.
 *
 * The denominator trace ("All active areas of noncompliance") counts areas of noncompliance that were active in each
 * month. The numerator trace ("Active areas of noncompliance with TTA support") counts the monthly subset
 * of those areas of noncompliance that also have an approved AR in that same month.
 */
export default async function activeNoncompliantCitationsWithTtaSupport(
  scopes: IScopes
): Promise<IActiveNoncompliantCitationsWithTtaSupport[]> {
  const approvedReports = await ActivityReport.findAll({
    attributes: ['id', 'startDate'],
    where: {
      [Op.and]: [
        ...scopes.activityReport,
        { startDate: { [Op.not]: null } }, // todo: replace with min_monitoring_date when the date filter pr is merged
        { calculatedStatus: REPORT_STATUSES.APPROVED },
      ],
    },
    include: [
      {
        // removed scopes so that unnecessary tables are not included (otherEntities)
        model: ActivityRecipient.unscoped(),
        as: 'activityRecipients',
        required: true,
        attributes: ['grantId'],
        where: {
          grantId: {
            [Op.not]: null,
          },
        },
        include: [
          {
            // removed scopes so that unnecessary tables are not included (recipient)
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

  const continuousMonths = buildContinuousMonths(months);

  // activityRecipientIds = grant IDs
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

  if (!continuousMonths.length) {
    return [
      {
        name: 'Active areas of noncompliance with TTA support',
        x: [],
        y: [],
        month: [],
        id: TRACE_IDS.ACTIVE_AREAS_OF_NONCOMPLIANCE_WITH_TTA_SUPPORT,
        trace: 'circle',
      },
      {
        name: 'All active areas of noncompliance',
        x: [],
        y: [],
        month: [],
        id: TRACE_IDS.ALL_ACTIVE_AREAS_OF_NONCOMPLIANCE,
        trace: 'triangle',
      },
    ];
  }

  if (!grantIds.length) {
    const x = continuousMonths.map((month) => moment(month).format('MMM YYYY'));
    const zeroes = x.map(() => 0);
    return [
      {
        name: 'Active areas of noncompliance with TTA support',
        x,
        y: zeroes,
        month: x.map(() => ''),
        id: TRACE_IDS.ACTIVE_AREAS_OF_NONCOMPLIANCE_WITH_TTA_SUPPORT,
        trace: 'circle',
      },
      {
        name: 'All active areas of noncompliance',
        x,
        y: zeroes,
        month: x.map(() => ''),
        id: TRACE_IDS.ALL_ACTIVE_AREAS_OF_NONCOMPLIANCE,
        trace: 'triangle',
      },
    ];
  }

  let rows = [] as IMonthlyCounts[];

  try {
    rows = await sequelize.query<IMonthlyCounts>(
      `WITH months AS (
      SELECT unnest(ARRAY[:monthStarts]::date[]) AS month_start
    ),
    active_noncompliance AS (
      SELECT
        m.month_start,
        COUNT(DISTINCT c.id)::int AS total_active_noncompliance
      FROM months m
      JOIN "GrantCitations" gc
        ON gc."grantId" IN (:grantIds)
      JOIN "Citations" c
        ON c.id = gc."citationId"
      WHERE c."calculated_finding_type" = 'Noncompliance'
        AND c."deletedAt" IS NULL
        AND c.initial_report_delivery_date < (m.month_start + INTERVAL '1 month')::date
        AND c.active_through >= m.month_start
      GROUP BY m.month_start
    ),
    tta_references AS (
      SELECT DISTINCT
        DATE_TRUNC('month', ar."startDate")::date AS month_start,
        aroc."citationId" AS citation_id
      FROM "ActivityReportObjectives" aro
      JOIN "ActivityReportObjectiveCitations" aroc
        ON aroc."activityReportObjectiveId" = aro.id
      JOIN "ActivityReports" ar
        ON ar.id = aro."activityReportId"
      WHERE ar.id IN (:approvedReportIds)
    ),
    tta_noncompliance AS (
      SELECT
        m.month_start,
        COUNT(DISTINCT c.id)::int AS noncompliance_with_tta
      FROM months m
      JOIN tta_references tr
        ON tr.month_start = m.month_start
      JOIN "Citations" c
        ON c.id = tr.citation_id
      JOIN "GrantCitations" gc
        ON gc."citationId" = c.id
      WHERE gc."grantId" IN (:grantIds)
        AND c."calculated_finding_type" = 'Noncompliance'
        AND c."deletedAt" IS NULL
        AND c.initial_report_delivery_date < (m.month_start + INTERVAL '1 month')::date
        AND c.active_through >= m.month_start
      GROUP BY m.month_start
    )
    SELECT
      TO_CHAR(m.month_start,'YYYY-MM-DD') AS month_start,
      COALESCE(td.noncompliance_with_tta, 0)::int AS noncompliance_with_tta,
      COALESCE(ad.total_active_noncompliance, 0)::int AS total_active_noncompliance
    FROM months m
    LEFT JOIN active_noncompliance ad
      ON ad.month_start = m.month_start
    LEFT JOIN tta_noncompliance td
      ON td.month_start = m.month_start
    ORDER BY m.month_start ASC;`,
      {
        replacements: {
          monthStarts: continuousMonths.map((month) => moment(month).format('YYYY-MM-DD')),
          grantIds,
          approvedReportIds,
        },
        type: QueryTypes.SELECT,
      }
    );
  } catch (err) {
    console.log(err);
  }

  const rowsByMonthStart: MonthCountByMonthStart = new Map(
    rows.map((row: IMonthlyCounts) => [row.month_start, row])
  );
  const monthRows: IMonthlyCounts[] = Array.from(rowsByMonthStart.values());

  const x: string[] = monthRows.map((row) => moment(row.month_start).format('MMM YYYY'));

  const response: IActiveNoncompliantCitationsWithTtaSupport[] = [
    {
      name: 'Active areas of noncompliance with TTA support',
      x,
      y: monthRows.map((row) => row.noncompliance_with_tta),
      month: x.map(() => ''),
      id: TRACE_IDS.ACTIVE_AREAS_OF_NONCOMPLIANCE_WITH_TTA_SUPPORT,
      trace: 'circle',
    },
    {
      name: 'All active areas of noncompliance',
      x,
      y: monthRows.map((row) => row.total_active_noncompliance),
      month: x.map(() => ''),
      id: TRACE_IDS.ALL_ACTIVE_AREAS_OF_NONCOMPLIANCE,
      trace: 'triangle',
    },
  ];

  return response;
}
