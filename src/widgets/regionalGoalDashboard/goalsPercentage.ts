import { Op } from 'sequelize';
import db from '../../models';

const { Goal } = db;

export default async function goalsPercentage(scopes) {
  const allGoals = await Goal.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [
        scopes.goal[0],
        {
          onApprovedAR: {
            [Op.eq]: true,
          },
        },
      ],
    },
    raw: true,
  });

  const filteredGoals = await Goal.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [
        scopes.goal,
        {
          onApprovedAR: {
            [Op.eq]: true,
          },
        },
      ],
    },
    raw: true,
  });

  // Calculate the percentage of filteredGoals / allGoals:
  const numerator = Object.keys(filteredGoals).length;
  const denominator = Object.keys(allGoals).length;
  const percentage = (numerator / denominator) * 100;

  return { numerator, denominator, percentage };
}
