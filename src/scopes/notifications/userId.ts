import { Op } from 'sequelize';
import { filterStringArrayToNumberArray } from '../utils';

export function withUserId(userIds: string[]) {
  return {
    where: {
      userId: {
        [Op.in]: filterStringArrayToNumberArray(userIds),
      },
    },
  };
}
