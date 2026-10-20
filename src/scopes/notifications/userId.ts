import { Op } from 'sequelize';
import { validatedIdArray } from '../utils';

export function withUserId(userIds: string[]) {
  return {
    userId: {
      [Op.in]: validatedIdArray(userIds),
    },
  };
}
