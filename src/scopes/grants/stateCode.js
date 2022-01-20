/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';

export function withStateCode(stateCodes) {
  return {
    stateCode: {
      [Op.in]: stateCodes,
    },
  };
}
