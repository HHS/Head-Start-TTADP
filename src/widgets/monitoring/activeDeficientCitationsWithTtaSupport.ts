import { REPORT_STATUSES, TRACE_IDS } from '@ttahub/common';
import { uniq } from 'lodash';
import moment from 'moment';
import { Op, QueryTypes } from 'sequelize';
import db, { sequelize } from '../../models';
import { buildContinuousMonths } from '../../scopes/utils';
import type { IScopes } from '../types';
import { MIN_MONITORING_DATE } from './constants';

const {
  ActivityReport,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  GrantCitation,
  Citation,
} = db;

interface IActiveDeficientCitationsWithTtaSupport {
  name: 'Active deficiencies with TTA support' | 'All active deficiencies';
  x: string[];
  y: number[];
  month: string[];
  id: string;
  trace: 'circle' | 'triangle';
}

interface IMonthlyCounts {
  month_start: string;
  deficiencies_with_tta: number;
  total_active_deficiencies: number;
  citation_ids_with_tta: number[];
}

type MonthCountByMonthStart = Map<string, IMonthlyCounts>;

/**
 * Returns monthly traces for active deficiencies and active deficiencies with TTA support.
 *
 * The denominator trace ("All active Deficiencies") counts deficiencies that were active in each
 * month. The numerator trace ("Active Deficiencies with TTA support") counts the monthly subset
 * of those deficiencies that also have an approved AR in that same month.
 */
export default async function activeDeficientCitationsWithTtaSupport(
  scopes: IScopes
): Promise<IActiveDeficientCitationsWithTtaSupport[]> {
  const grantCitations = await GrantCitation.findAll({
    attributes: ['id', 'citationId'],
    where: {
      [Op.and]: [...scopes.grantCitation],
    },
  });

  const citationIds = grantCitations.map((gc) => gc.citationId);

  // If no grant citations exist, we still need to find approved reports to determine the month range,
  // but those reports won't match the citation filter so we'll return zero-filled traces
  const approvedReports = citationIds.length
    ? await ActivityReport.findAll({
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
      })
    : await ActivityReport.findAll({
        attributes: ['id', 'startDate'],
        where: {
          [Op.and]: [
            ...scopes.activityReport,
            { startDate: { [Op.gte]: MIN_MONITORING_DATE } },
            { calculatedStatus: REPORT_STATUSES.APPROVED },
            sequelize.literal(`EXISTS (
              SELECT 1
              FROM "ActivityReportObjectives" aro
              JOIN "ActivityReportObjectiveCitations" aroc ON aroc."activityReportObjectiveId" = aro.id
              JOIN "Citations" c ON c.id = aroc."citationId"
              WHERE aro."activityReportId" = "ActivityReport".id
                AND c."deletedAt" IS NULL
            )`),
          ],
        },
      });

  const months = uniq(
    approvedReports.map((report: (typeof approvedReports)[number]) =>
      moment(report.getDataValue('startDate') as string)
        .startOf('month')
        .format('YYYY-MM-DD')
    )
  ).sort() as string[];

  const continuousMonths = buildContinuousMonths(months);

  const approvedReportIds = uniq(
    approvedReports.map(
      (report: (typeof approvedReports)[number]) => report.getDataValue('id') as number
    )
  );

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

  if (!grantCitations.length) {
    const x = continuousMonths.map((month) => moment(month).format('MMM YYYY'));
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
    `WITH months AS (
      SELECT unnest(ARRAY[:monthStarts]::date[]) AS month_start
    ),
    active_deficiencies AS (
      SELECT
        m.month_start,
        COUNT(DISTINCT c.id)::int AS total_active_deficiencies
      FROM months m
      JOIN "GrantCitations" gc
        ON gc.id IN (:grantCitationIds)
      JOIN "Citations" c
        ON c.id = gc."citationId"
      WHERE c."calculated_finding_type" = 'Deficiency'
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
    tta_deficiencies AS (
      SELECT
        m.month_start,
        COUNT(DISTINCT c.id)::int AS deficiencies_with_tta,
        ARRAY_AGG(DISTINCT c.id) AS citation_ids_with_tta
      FROM months m
      JOIN tta_references tr
        ON tr.month_start = m.month_start
      JOIN "Citations" c
        ON c.id = tr.citation_id
      JOIN "GrantCitations" gc
        ON gc."citationId" = c.id
      WHERE gc.id IN (:grantCitationIds)
        AND c."calculated_finding_type" = 'Deficiency'
        AND c."deletedAt" IS NULL
        AND c.initial_report_delivery_date < (m.month_start + INTERVAL '1 month')::date
        AND c.active_through >= m.month_start
      GROUP BY m.month_start
    )
    SELECT
      TO_CHAR(m.month_start,'YYYY-MM-DD') AS month_start,
      COALESCE(td.deficiencies_with_tta, 0)::int AS deficiencies_with_tta,
      COALESCE(ad.total_active_deficiencies, 0)::int AS total_active_deficiencies
    FROM months m
    LEFT JOIN active_deficiencies ad
      ON ad.month_start = m.month_start
    LEFT JOIN tta_deficiencies td
      ON td.month_start = m.month_start
    ORDER BY m.month_start ASC;`,
    {
      replacements: {
        monthStarts: continuousMonths.map((month) => moment(month).format('YYYY-MM-DD')),
        grantCitationIds: grantCitations.map((gc: { id: number }) => gc.id),
        approvedReportIds,
      },
      type: QueryTypes.SELECT,
    }
  );

  const rowsByMonthStart: MonthCountByMonthStart = new Map(
    rows.map((row: IMonthlyCounts) => [row.month_start, row])
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
