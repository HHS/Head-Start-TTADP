/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
import { validatedIdArray } from '../utils';

export function withId(ids: string[]) {
  const numericIds = validatedIdArray(ids);

  return {
    id: {
      [Op.in]: numericIds,
    },
  };
}
