import { Op } from 'sequelize';
import { REPORT_STATUSES } from '../../constants';
import db from '../../models';

const { Goal, ActivityReportGoal, ActivityReport } = db;

export default async function goalsPercentage(scopes) {
  const allGoals = await Goal.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [scopes.goal[0]],
    },
    include: [
      {
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        separate: true,
        include: [
          {
            model: ActivityReport,
            as: 'activityReport',
            where: {
              [Op.and]: {
                calculatedStatus: {
                  [Op.eq]: REPORT_STATUSES.APPROVED,
                },
              },
            },
          },
        ],
      },
    ],
    raw: true,
  });

  const filteredGoals = await Goal.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [scopes.goal],
    },
    include: [
      {
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        separate: true,
        include: [
          {
            model: ActivityReport,
            as: 'activityReport',
            where: {
              [Op.and]: {
                calculatedStatus: {
                  [Op.eq]: REPORT_STATUSES.APPROVED,
                },
              },
            },
          },
        ],
      },
    ],
    raw: true,
  });

  // Calculate the percentage of filteredGoals / allGoals:
  const numerator = Object.keys(filteredGoals).length;
  const denominator = Object.keys(allGoals).length;
  const percentage = (numerator / denominator) * 100;

  return { numerator, denominator, percentage };
}
