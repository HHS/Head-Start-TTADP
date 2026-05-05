import { REPORT_STATUSES } from '@ttahub/common';
import { uniq } from 'lodash';
import moment from 'moment';
import { Op, QueryTypes } from 'sequelize';
import { auditLogger } from '../../logger';
import db, { sequelize } from '../../models';
import { buildContinuousMonths } from '../../scopes/utils';
import type { IScopes } from '../types';

const { ActivityReport } = db;

interface IReportCountByFindingCategory {
  name: string;
  months: string[];
  counts: number[];
  total: number;
}

interface AggregatedRow {
  guidance_category: string;
  month_start: string;
  report_count: number;
}

const NO_CATEGORY_LABEL = 'No finding category assigned';

const WARN_THRESHOLD = 3000;

export default async function reportCountByFindingCategory(
  scopes: IScopes
): Promise<IReportCountByFindingCategory[]> {
  const approvedReports = (await ActivityReport.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [
        ...scopes.activityReport,
        { startDate: { [Op.not]: null } },
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
    raw: true,
  })) as { id: number }[];

  if (!approvedReports.length) {
    return [];
  }

  if (approvedReports.length > WARN_THRESHOLD) {
    auditLogger.warn(
      `reportCountByFindingCategory: More than ${WARN_THRESHOLD} approved reports found, which may impact performance`,
      {
        approvedReportCount: approvedReports.length,
      }
    );
  }

  const approvedReportIds = approvedReports.map((r) => r.id);

  const rows = await sequelize.query<AggregatedRow>(
    `SELECT
      COALESCE(NULLIF(BTRIM(c.guidance_category), ''), :noCategory) AS guidance_category,
      TO_CHAR(DATE_TRUNC('month', ar."startDate")::date, 'YYYY-MM-DD') AS month_start,
      COUNT(DISTINCT ar.id)::int AS report_count
    FROM "ActivityReports" ar
    JOIN "ActivityReportObjectives" aro ON aro."activityReportId" = ar.id
    JOIN "ActivityReportObjectiveCitations" aroc ON aroc."activityReportObjectiveId" = aro.id
    JOIN "Citations" c ON c.id = aroc."citationId"
    WHERE ar.id IN (:approvedReportIds)
      AND c."deletedAt" IS NULL
    GROUP BY COALESCE(NULLIF(BTRIM(c.guidance_category), ''), :noCategory), DATE_TRUNC('month', ar."startDate")::date
    ORDER BY month_start ASC, guidance_category ASC`,
    {
      replacements: {
        noCategory: NO_CATEGORY_LABEL,
        approvedReportIds,
      },
      type: QueryTypes.SELECT,
    }
  );

  if (!rows.length) {
    return [];
  }

  const continuousMonths = buildContinuousMonths(
    (uniq(rows.map((row: AggregatedRow) => row.month_start)) as string[]).sort()
  );

  const monthLabels = continuousMonths.map((m) => moment(m).format('MMM YYYY'));

  // Build map: category -> month_start -> count
  const categoryMonthMap = rows.reduce(
    (acc: Map<string, Map<string, number>>, row: AggregatedRow) => {
      const { guidance_category: category, month_start: monthStart, report_count: count } = row;
      if (!acc.has(category)) {
        acc.set(category, new Map());
      }
      (acc.get(category) as Map<string, number>).set(monthStart, count);
      return acc;
    },
    new Map<string, Map<string, number>>()
  );

  return Array.from(categoryMonthMap.entries()).map(([category, monthMap]) => {
    const counts = continuousMonths.map((m) => monthMap.get(m) ?? 0);
    return {
      name: category,
      months: monthLabels,
      counts,
      total: counts.reduce((sum, c) => sum + c, 0),
    };
  });
}
