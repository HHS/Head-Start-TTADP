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
 * Counts ARs where calculatedStatus = APPROVED and startDate >= 2025-09-01,
 * joined to non-prestandard curated goals.
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
      [Op.and]: [scopes.activityReport, { calculatedStatus: REPORT_STATUSES.APPROVED, startDate: { [Op.gte]: GOAL_CUTOFF_DATE } }],
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
            },
            include: [
              {
                // Restrict to goals belonging to the target recipient's grants.
                model: db.Grant.unscoped(),
                as: 'grant',
                attributes: [],
                required: true,
                where: scopes.grant.where,
              },
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
 * "EventReportPilot" alias matches the root table. Counts complete sessions
 * whose data.startDate >= 2025-09-01 and whose goal template is curated
 * with at least one non-prestandard goal for the target recipient.
 */
async function getApprovedTRCountsByCategory(
  scopes: IScopes,
): Promise<ICategoryCount[]> {
  const matchingGrants = await db.Grant.unscoped().findAll({
    attributes: ['id'],
    where: scopes.grant.where,
    raw: true,
  });
  const grantIds = (matchingGrants as unknown as { id: number }[]).map((g) => Number(g.id));
  if (grantIds.length === 0) return [];
  const grantIdTextList = grantIds.map((id) => sequelize.escape(String(id))).join(',');
  const cutoffDate = GOAL_CUTOFF_DATE.toISOString().split('T')[0];
  const sessionStartDateExpression = `NULLIF("sessionReports"."data"->>'startDate', '')`;
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
        where: {
          data: { status: TRAINING_REPORT_STATUSES.COMPLETE },
          [Op.and]: [
            sequelize.literal(`
              (
                ${sessionStartDateExpression} ~ '^(0[1-9]|1[0-2])\\/(0[1-9]|[12][0-9]|3[01])\\/[0-9]{4}$'
                AND TO_CHAR(TO_DATE(${sessionStartDateExpression}, 'MM/DD/YYYY'), 'MM/DD/YYYY') = ${sessionStartDateExpression}
                AND TO_DATE(${sessionStartDateExpression}, 'MM/DD/YYYY') >= '${cutoffDate}'::date
              )
            `),
            sequelize.literal(`EXISTS (
              SELECT 1
              FROM jsonb_to_recordset(
                CASE WHEN jsonb_typeof("sessionReports"."data"->'recipients') = 'array'
                     THEN "sessionReports"."data"->'recipients'
                     ELSE '[]'::jsonb END
              ) AS r("label" text, "value" text)
              WHERE r."value" = ANY (ARRAY[${grantIdTextList}]::text[])
            )`),
          ],
        },
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
                // Restrict to non-prestandard goals belonging to the target
                // recipient's grants so that goals from other recipients
                // cannot qualify a template for this recipient.
                model: db.Goal,
                as: 'goals',
                attributes: [],
                required: true,
                where: {
                  prestandard: false,
                },
                include: [
                  {
                    model: db.Grant.unscoped(),
                    as: 'grant',
                    attributes: [],
                    required: true,
                    where: scopes.grant.where,
                  },
                ],
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
