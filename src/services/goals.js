import {
  Goal,
  Grant,
} from '../models';

// eslint-disable-next-line import/prefer-default-export
export async function goalsForGrants(grantIds) {
  return Goal.findAll({
    include: {
      model: Grant,
      as: 'grants',
      attributes: ['id'],
      where: {
        id: grantIds,
      },
    },
    order: ['createdAt'],
  });
}
