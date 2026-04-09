/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';

export function withId(ids: string[]) {
  // convert string array to number array
  const numericIds = ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id));

  return {
    id: {
      [Op.in]: numericIds,
    },
  };
}
