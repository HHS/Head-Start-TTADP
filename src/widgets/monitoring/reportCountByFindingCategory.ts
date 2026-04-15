import moment from 'moment';
import { uniq } from 'lodash';
import { Op, QueryTypes } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import { IScopes } from '../types';
import db, { sequelize } from '../../models';
import { buildContinuousMonths } from '../../scopes/utils';

const { ActivityReport } = db;

interface IReportCountByFindingCategory {
  name: string;
  months: string[];
  counts: number[];
}

interface AggregatedRow {
  guidance_category: string;
  month_start: string;
  report_count: number;
}

const NO_CATEGORY_LABEL = 'No finding category assigned';

export default async function reportCountByFindingCategory(
  scopes: IScopes,
): Promise<IReportCountByFindingCategory[]> {
  const approvedReports = await ActivityReport.findAll({
    attributes: ['id', 'startDate'],
    where: {
      [Op.and]: [
        ...scopes.activityReport,
        { startDate: { [Op.not]: null } },
        { calculatedStatus: REPORT_STATUSES.APPROVED },
      ],
    },
    raw: true,
  }) as { id: number; startDate: string }[];

  if (!approvedReports.length) {
    return [];
  }

  const approvedReportIds = approvedReports.map((r) => r.id);

  const months = uniq(
    approvedReports.map((r) => moment(r.startDate).startOf('month').format('YYYY-MM-DD')),
  ).sort() as string[];

  const continuousMonths = buildContinuousMonths(months);

  if (!continuousMonths.length) {
    return [];
  }

  const rows = await sequelize.query<AggregatedRow>(
    `SELECT
      COALESCE(c.guidance_category, :noCategory) AS guidance_category,
      TO_CHAR(DATE_TRUNC('month', ar."startDate")::date, 'YYYY-MM-DD') AS month_start,
      COUNT(DISTINCT ar.id)::int AS report_count
    FROM "ActivityReports" ar
    JOIN "ActivityReportObjectives" aro ON aro."activityReportId" = ar.id
    JOIN "ActivityReportObjectiveCitations" aroc ON aroc."activityReportObjectiveId" = aro.id
    JOIN "Citations" c ON c.id = aroc."citationId"
    WHERE ar.id IN (:approvedReportIds)
    GROUP BY c.guidance_category, DATE_TRUNC('month', ar."startDate")::date
    ORDER BY month_start ASC, guidance_category ASC`,
    {
      replacements: {
        noCategory: NO_CATEGORY_LABEL,
        approvedReportIds,
      },
      type: QueryTypes.SELECT,
    },
  );

  if (!rows.length) {
    return [];
  }

  const monthLabels = continuousMonths.map((m) => moment(m).format('MMM YYYY'));

  // Build map: category -> month_start -> count
  const categoryMonthMap = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const { guidance_category: category, month_start: monthStart, report_count: count } = row;
    if (!categoryMonthMap.has(category)) {
      categoryMonthMap.set(category, new Map());
    }
    categoryMonthMap.get(category)!.set(monthStart, count);
  }

  return Array.from(categoryMonthMap.entries()).map(([category, monthMap]) => ({
    name: category,
    months: monthLabels,
    counts: continuousMonths.map((m) => monthMap.get(m) ?? 0),
  }));
}
