import moment from 'moment';
import { uniq } from 'lodash';
import { Op } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import { IScopes } from '../types';
import db from '../../models';

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
  });

  const months = uniq(
    approvedReports.map(
      (report: typeof approvedReports[number]) => moment(report.getDataValue('startDate') as string).startOf('month').format('YYYY-MM-DD'),
    ),
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

  if (!continuousMonths.length) {
    return [];
  }

  const approvedReportIds = uniq(
    approvedReports.map((r: typeof approvedReports[number]) => r.getDataValue('id') as number),
  );

  const reportMonthMap = new Map<number, string>();
  approvedReports.forEach((r: typeof approvedReports[number]) => {
    const id = r.getDataValue('id') as number;
    const month = moment(r.getDataValue('startDate') as string).startOf('month').format('YYYY-MM-DD');
    reportMonthMap.set(id, month);
  });

  const citationRows = await ActivityReportObjectiveCitation.findAll({
    attributes: [],
    where: {},
    include: [
      {
        model: ActivityReportObjective,
        as: 'activityReportObjective',
        attributes: ['activityReportId'],
        required: true,
        where: {
          activityReportId: { [Op.in]: approvedReportIds },
        },
      },
      {
        model: Citation,
        as: 'citationModel',
        attributes: ['guidance_category'],
        required: true,
        where: {
          guidance_category: { [Op.not]: null },
          deletedAt: null,
        },
      },
    ],
    raw: true,
    nest: true,
  });

  // Map: category -> month -> Set<reportId>
  const categoryMonthReports = new Map<string, Map<string, Set<number>>>();

  type CitationRow = {
    activityReportObjective: { activityReportId: number },
    citationModel: { guidance_category: string },
  };

  citationRows.forEach((row: CitationRow) => {
    const reportId = row.activityReportObjective.activityReportId;
    const category = row.citationModel.guidance_category;
    const month = reportMonthMap.get(reportId);
    if (!month) return;

    if (!categoryMonthReports.has(category)) {
      categoryMonthReports.set(category, new Map());
    }
    const monthMap = categoryMonthReports.get(category)!;
    if (!monthMap.has(month)) {
      monthMap.set(month, new Set());
    }
    monthMap.get(month)!.add(reportId);
  });

  const monthLabels = continuousMonths.map((m) => moment(m).format('MMM YYYY'));

  return Array.from(categoryMonthReports.entries()).map(([category, monthMap]) => ({
    name: category,
    months: monthLabels,
    counts: continuousMonths.map((m) => monthMap.get(m)?.size ?? 0),
  }));
}
