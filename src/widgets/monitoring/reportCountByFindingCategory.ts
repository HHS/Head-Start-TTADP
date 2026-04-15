import moment from 'moment';
import { Op } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import { IScopes } from '../types';
import db from '../../models';
import { buildContinuousMonths } from '../../scopes/utils';

const {
  ActivityReport,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  Citation,
} = db;

interface IReportCountByFindingCategory {
  name: string;
  months: string[];
  counts: number[];
}

const NO_CATEGORY_LABEL = 'No finding category assigned';

interface CitationRow {
  activityReportObjective: {
    activityReportId: number;
    activityReport: { id: number; startDate: string };
  };
  citationModel: { guidance_category: string | null };
}

export default async function reportCountByFindingCategory(
  scopes: IScopes,
): Promise<IReportCountByFindingCategory[]> {
  const citationRows = await ActivityReportObjectiveCitation.findAll({
    attributes: [],
    include: [
      {
        model: ActivityReportObjective,
        as: 'activityReportObjective',
        attributes: ['activityReportId'],
        required: true,
        include: [
          {
            model: ActivityReport,
            as: 'activityReport',
            attributes: ['id', 'startDate'],
            required: true,
            where: {
              [Op.and]: [
                ...scopes.activityReport,
                { startDate: { [Op.not]: null } },
                { calculatedStatus: REPORT_STATUSES.APPROVED },
              ],
            },
          },
        ],
      },
      {
        model: Citation,
        as: 'citationModel',
        attributes: ['guidance_category'],
        required: true,
      },
    ],
    raw: true,
    nest: true,
  }) as CitationRow[];

  const reportMonthMap = new Map<number, string>();
  citationRows.forEach((row: CitationRow) => {
    const { id, startDate } = row.activityReportObjective.activityReport;
    if (!reportMonthMap.has(id)) {
      reportMonthMap.set(id, moment(startDate).startOf('month').format('YYYY-MM-DD'));
    }
  });

  const months = Array.from(new Set(reportMonthMap.values())).sort();

  const continuousMonths = buildContinuousMonths(months);

  if (!continuousMonths.length) {
    return [];
  }

  // Map: category -> month -> Set<reportId>
  const categoryMonthReports = new Map<string, Map<string, Set<number>>>();

  citationRows.forEach((row: CitationRow) => {
    const reportId = row.activityReportObjective.activityReportId;
    const category = row.citationModel.guidance_category ?? NO_CATEGORY_LABEL;
    const month = reportMonthMap.get(reportId);
    if (!month) return;

    if (!categoryMonthReports.has(category)) {
      categoryMonthReports.set(category, new Map());
    }
    const monthMap = categoryMonthReports.get(category);
    if (!monthMap) return;
    if (!monthMap.has(month)) {
      monthMap.set(month, new Set());
    }
    monthMap.get(month)?.add(reportId);
  });

  const monthLabels = continuousMonths.map((m) => moment(m).format('MMM YYYY'));

  return Array.from(categoryMonthReports.entries()).map(([category, monthMap]) => ({
    name: category,
    months: monthLabels,
    counts: continuousMonths.map((m) => monthMap.get(m)?.size ?? 0),
  }));
}
