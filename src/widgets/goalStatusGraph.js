import { Op } from 'sequelize';
import {
  Goal, Grant, Recipient, sequelize,
} from '../models';

export default async function goalStatusGraph(scopes) {
  const goals = await Goal.findAll({
    where: {
      [Op.and]: [
        scopes.goal,
        {
          status: {
            [Op.not]: null,
          },
        },
      ],
    },
    // BIGINT (type returned from count) gets converted to string. Explicitly set count to int
    attributes: [sequelize.literal('COUNT(DISTINCT("Goal".id))::int'), 'status'],
    group: ['"Goal".status'],
    includeIgnoreAttributes: false,
    raw: true,
    include: [{
      model: Grant,
      as: 'grants',
      required: true,
      include: [{
        model: Recipient,
        as: 'recipient',
        required: true,
      }],
    }],
  });

  const total = goals.reduce((sum, g) => sum + g.count, 0);
  return {
    total,
    goals,
  };
}
