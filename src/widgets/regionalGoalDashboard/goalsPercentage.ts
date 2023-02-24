import { Op } from 'sequelize';
import {
  // @ts-ignore
  Goal,
} from '../../models';

export default async function goalsPercentage(scopes) {
  // console.log("--------- scopes.goal");
  // console.log(scopes.goal);
  // console.log("--------- scopes.goal[0]");
  // console.log(scopes.goal[0]);
  // console.log("--------- scopes.goal[1]");
  // console.log(scopes.goal[1]);

  const allGoals = await Goal.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [scopes.goal[0]],
    },
    raw: true,
  });

  const filteredGoals = await Goal.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [scopes.goal],
    },
    raw: true,
  });

  // Calculate the percentage of filteredGoals / allGoals:
  const numerator = Object.keys(filteredGoals).length;
  const denominator = Object.keys(allGoals).length;
  const percentage = (numerator / denominator) * 100;

  return { numerator, denominator, percentage };
}
