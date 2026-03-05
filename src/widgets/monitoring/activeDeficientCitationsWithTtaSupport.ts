import moment from 'moment';
import { uniq } from 'lodash';
import { Op, QueryTypes } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import { IScopes } from '../types';
import db, { sequelize } from '../../models';

const { ActivityReport, ActivityRecipient } = db;

interface IActiveDeficientCitationsWithTtaSupport {
  name: 'Active deficiencies with TTA support' | 'All active deficiencies',
  x: string[],
  y: number[],
  month: string[],
  id: string,
  trace: 'circle' | 'triangle',
}

interface IMonthlyCounts {
  month_start: string,
  deficiencies_with_tta: number,
  total_active_deficiencies: number,
}

type MonthCountByMonthStart = Map<string, IMonthlyCounts>;

const TRACE_IDS = {
  ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT: 'active-deficiencies-with-tta-support',
  ALL_ACTIVE_DEFICIENCIES: 'all-active-deficiencies',
} as const;

/**
 * Returns monthly traces for active deficiencies and active deficiencies with TTA support.
 *
 * The denominator trace ("All active Deficiencies") counts deficiencies that were active in each
 * month. The numerator trace ("Active Deficiencies with TTA support") counts the monthly subset
 * of those deficiencies that also have an approved AR in that same month.
 */
export default async function activeDeficientCitationsWithTtaSupport(
  scopes: IScopes,
): Promise<IActiveDeficientCitationsWithTtaSupport[]> {
  const approvedReports = await ActivityReport.findAll({
    attributes: ['id', 'startDate'],
    where: {
      [Op.and]: [
        scopes.activityReport,
        { startDate: { [Op.not]: null } },
        { calculatedStatus: REPORT_STATUSES.APPROVED },
      ],
    },
    include: [
      {
        model: ActivityRecipient,
        as: 'activityRecipients',
        attributes: ['grantId'],
        where: {
          grantId: {
            [Op.not]: null,
          },
        },
      },
    ],
  });

  const months = uniq(
    approvedReports
      .map((report: typeof approvedReports[number]) => moment(report.getDataValue('startDate') as string).startOf('month').format('YYYY-MM-DD')),
  ).sort();

  const continuousMonths: string[] = [];
  if (months.length) {
    let cursor = moment(months[0]);
    const end = moment(months[months.length - 1]);
    while (cursor.isSameOrBefore(end, 'month')) {
      continuousMonths.push(cursor.format('YYYY-MM-DD'));
      cursor = cursor.add(1, 'month');
    }
  }

  // activityRecipientIds = grant IDs
  const grantIds = uniq(approvedReports.flatMap((report: typeof approvedReports[number]) => report.getDataValue('activityRecipients') as { grantId: number }[])
    .map((ar: { grantId: number }) => ar.grantId));

  const approvedReportIds = approvedReports.map((report: typeof approvedReports[number]) => report.getDataValue('id') as number);

  if (!continuousMonths.length) {
    return [
      {
        name: 'Active deficiencies with TTA support',
        x: [],
        y: [],
        month: [],
        id: TRACE_IDS.ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT,
        trace: 'circle',
      },
      {
        name: 'All active deficiencies',
        x: [],
        y: [],
        month: [],
        id: TRACE_IDS.ALL_ACTIVE_DEFICIENCIES,
        trace: 'triangle',
      },
    ];
  }

  if (!grantIds.length) {
    const x = continuousMonths.map((month) => (moment(month).format('MMM YYYY')));
    const zeroes = x.map(() => 0);
    return [
      {
        name: 'Active deficiencies with TTA support',
        x,
        y: zeroes,
        month: x.map(() => ''),
        id: TRACE_IDS.ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT,
        trace: 'circle',
      },
      {
        name: 'All active deficiencies',
        x,
        y: zeroes,
        month: x.map(() => ''),
        id: TRACE_IDS.ALL_ACTIVE_DEFICIENCIES,
        trace: 'triangle',
      },
    ];
  }

  const rows = await sequelize.query<IMonthlyCounts>(
    `SELECT
      m.month_start::text,
      COALESCE(tsd.deficiencies_with_tta, 0)::int AS deficiencies_with_tta,
      COALESCE(ad.total_active_deficiencies, 0)::int AS total_active_deficiencies
    FROM unnest(ARRAY[:monthStarts]::date[]) AS m(month_start)
    LEFT JOIN LATERAL (
      SELECT
        COUNT(DISTINCT c.id)::int AS total_active_deficiencies
      FROM "Citations" c
      JOIN "GrantCitations" gc
        ON gc."citationId" = c.id
      WHERE gc."grantId" IN (:grantIds)
        AND c."calculated_finding_type" = 'Deficiency'
        AND c."deletedAt" IS NULL
        AND c.reported_date < (m.month_start + INTERVAL '1 month')::date
        AND c.active_through >= m.month_start
    ) ad
      ON true
    LEFT JOIN LATERAL (
      SELECT
        COUNT(DISTINCT c.id)::int AS deficiencies_with_tta
      FROM "ActivityReportObjectives" aro
      JOIN "ActivityReportObjectiveCitations" aroc
        ON aroc."activityReportObjectiveId" = aro.id
      JOIN "ActivityReports" ar
        ON ar.id = aro."activityReportId"
      JOIN LATERAL jsonb_array_elements(aroc."monitoringReferences") ref(reference)
        ON true
      JOIN "Citations" c
        ON c.finding_uuid = ref.reference->>'findingId'
      JOIN "GrantCitations" gc
        ON gc."citationId" = c.id
      WHERE ar.id IN (:approvedReportIds)
        AND gc."grantId" IN (:grantIds)
        AND DATE_TRUNC('month', ar."startDate")::date = m.month_start
        AND c."calculated_finding_type" = 'Deficiency'
        AND c."deletedAt" IS NULL
        AND c.reported_date < (m.month_start + INTERVAL '1 month')::date
        AND c.active_through >= m.month_start
    ) tsd
      ON true
    ORDER BY m.month_start ASC;`,
    {
      replacements: {
        monthStarts: continuousMonths.map((month) => moment(month).format('YYYY-MM-DD')),
        grantIds,
        approvedReportIds,
      },
      type: QueryTypes.SELECT,
    },
  );

  const rowsByMonthStart: MonthCountByMonthStart = new Map(
    rows.map((row: IMonthlyCounts) => [row.month_start, row]),
  );
  const monthRows: IMonthlyCounts[] = Array.from(rowsByMonthStart.values());

  const x: string[] = monthRows.map((row) => moment(row.month_start).format('MMM YYYY'));

  const response: IActiveDeficientCitationsWithTtaSupport[] = [
    {
      name: 'Active deficiencies with TTA support',
      x,
      y: monthRows.map((row) => row.deficiencies_with_tta),
      month: x.map(() => ''),
      id: TRACE_IDS.ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT,
      trace: 'circle',
    },
    {
      name: 'All active deficiencies',
      x,
      y: monthRows.map((row) => row.total_active_deficiencies),
      month: x.map(() => ''),
      id: TRACE_IDS.ALL_ACTIVE_DEFICIENCIES,
      trace: 'triangle',
    },
  ];

  return response;
}
