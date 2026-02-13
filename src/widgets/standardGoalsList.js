import { REPORT_STATUSES } from '@ttahub/common'
import { Op } from 'sequelize'
import { ActivityReport, ActivityReportGoal, Goal, GoalTemplate, sequelize } from '../models'
import { CREATION_METHOD } from '../constants'

export default async function standardGoalsList(scopes) {
  // Query for all standard goals linked to activity reports
  const results = await ActivityReport.findAll({
    attributes: [
      [sequelize.col('activityReportGoals.goal.goalTemplate.id'), 'goalTemplateId'],
      [sequelize.col('activityReportGoals.goal.goalTemplate.standard'), 'standard'],
      [sequelize.fn('COUNT', sequelize.literal('DISTINCT "ActivityReport"."id"')), 'count'],
    ],
    where: {
      [Op.and]: [scopes.activityReport, { calculatedStatus: REPORT_STATUSES.APPROVED }],
      startDate: {
        [Op.gte]: new Date('2025-09-01'),
      },
    },
    include: [
      {
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        attributes: [],
        required: true,
        include: [
          {
            model: Goal,
            as: 'goal',
            attributes: [],
            required: true,
            where: {
              prestandard: false,
            },
            include: [
              {
                model: GoalTemplate,
                as: 'goalTemplate',
                attributes: [],
                required: true,
                where: {
                  creationMethod: CREATION_METHOD.CURATED,
                },
              },
            ],
          },
        ],
      },
    ],
    group: ['activityReportGoals.goal.goalTemplate.id', 'activityReportGoals.goal.goalTemplate.standard'],
    raw: true,
    nest: true,
  })

  // Transform results to format expected by the widget
  return results
    .map((result) => ({
      name: result.standard,
      count: parseInt(result.count, 10),
    }))
    .sort((a, b) => b.count - a.count)
}
