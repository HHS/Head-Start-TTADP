import { REPORT_STATUSES, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { Op } from 'sequelize';
import { CREATION_METHOD } from '../constants';
import db, { sequelize } from '../models';
import type { IScopes } from './types';

const GOAL_CUTOFF_DATE = new Date('2025-09-01');
const MONITORING_STANDARD = 'Monitoring';

interface ICategoryCount {
  standard: string;
  count: number;
}

export interface IGoalCategoryComparison {
  category: string;
  activityReportCount: number;
  sessionReportCount: number;
  total: number;
}

/**
 * Returns distinct approved-AR count per goal category.
 * A goal qualifies when Goal.createdAt >= 2025-09-01 and the parent AR
 * calculatedStatus = APPROVED.
 * Scoped by scopes.activityReport.
 */
async function getApprovedARCountsByCategory(
  scopes: IScopes,
): Promise<ICategoryCount[]> {
  return db.ActivityReport.findAll({
    attributes: [
      [sequelize.col('activityReportGoals.goal.goalTemplate.standard'), 'standard'],
      [sequelize.cast(sequelize.fn('COUNT', sequelize.literal('DISTINCT "ActivityReport"."id"')), 'INTEGER'), 'count'],
    ],
    where: {
      [Op.and]: [scopes.activityReport, { calculatedStatus: REPORT_STATUSES.APPROVED }],
    },
    include: [
      {
        model: db.ActivityReportGoal,
        as: 'activityReportGoals',
        attributes: [],
        required: true,
        include: [
          {
            model: db.Goal,
            as: 'goal',
            attributes: [],
            required: true,
            where: {
              prestandard: false,
              createdAt: { [Op.gte]: GOAL_CUTOFF_DATE },
            },
            include: [
              {
                model: db.GoalTemplate,
                as: 'goalTemplate',
                attributes: [],
                required: true,
                where: {
                  creationMethod: CREATION_METHOD.CURATED,
                  standard: { [Op.not]: MONITORING_STANDARD, [Op.ne]: null },
                },
              },
            ],
          },
        ],
      },
    ],
    group: ['activityReportGoals.goal.goalTemplate.standard'],
    raw: true,
  }) as unknown as ICategoryCount[];
}

/**
 * Returns distinct complete session-report count per goal category.
 * Starts from EventReportPilot so the trainingReport scope's hardcoded
 * "EventReportPilot" alias matches the root table. Sessions and goal templates
 * are inner-joined so only complete sessions whose event passes the scope
 * and whose template has a qualifying goal (createdAt >= cutoff) are counted.
 */
async function getApprovedTRCountsByCategory(
  scopes: IScopes,
): Promise<ICategoryCount[]> {
  return db.EventReportPilot.findAll({
    attributes: [
      [sequelize.col('sessionReports->goalTemplates.standard'), 'standard'],
      [
        sequelize.cast(
          sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('sessionReports.id'))),
          'INTEGER',
        ),
        'count',
      ],
    ],
    where: { [Op.and]: [scopes.trainingReport] },
    include: [
      {
        model: db.SessionReportPilot,
        as: 'sessionReports',
        attributes: [],
        required: true,
        where: { data: { status: TRAINING_REPORT_STATUSES.COMPLETE } },
        include: [
          {
            through: { attributes: [] },
            model: db.GoalTemplate,
            as: 'goalTemplates',
            attributes: [],
            required: true,
            where: {
              creationMethod: CREATION_METHOD.CURATED,
              standard: { [Op.not]: MONITORING_STANDARD, [Op.ne]: null },
            },
            include: [
              {
                // A GoalTemplate only qualifies when at least one non-prestandard
                // Goal using it was created on or after the cutoff date —
                // consistent with the AR side.
                model: db.Goal,
                as: 'goals',
                attributes: [],
                required: true,
                where: {
                  createdAt: { [Op.gte]: GOAL_CUTOFF_DATE },
                  prestandard: false,
                },
              },
            ],
          },
        ],
      },
    ],
    group: [sequelize.col('sessionReports->goalTemplates.standard')],
    raw: true,
  }) as unknown as ICategoryCount[];
}

/**
 * Merges AR and TR category counts into a unified comparison array.
 * Categories present in only one side receive 0 for the absent side.
 * Sorted alphabetically by category name.
 */
export function mergeGoalCategoryCounts(
  arCounts: ICategoryCount[],
  trCounts: ICategoryCount[],
): IGoalCategoryComparison[] {
  const arMap = new Map(arCounts.map((r) => [r.standard, r.count]));
  const trMap = new Map(trCounts.map((r) => [r.standard, r.count]));
  const allCategories = new Set([...arMap.keys(), ...trMap.keys()]);

  return Array.from(allCategories)
    .map((category) => {
      const activityReportCount = Number(arMap.get(category) ?? 0);
      const sessionReportCount = Number(trMap.get(category) ?? 0);
      return {
        category,
        activityReportCount,
        sessionReportCount,
        total: activityReportCount + sessionReportCount,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category));
}

export default async function approvedARAndTRByGoalCategory(
  scopes: IScopes,
): Promise<IGoalCategoryComparison[]> {
  const [arCounts, trCounts] = await Promise.all([
    getApprovedARCountsByCategory(scopes),
    getApprovedTRCountsByCategory(scopes),
  ]);
  return mergeGoalCategoryCounts(arCounts, trCounts);
}
