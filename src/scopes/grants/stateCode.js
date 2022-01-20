import { Op } from 'sequelize';

export function withStateCode(stateCodes) {
  return {
    stateCode: {
      [Op.in]: stateCodes,
    },
  };
}

export function withoutStateCodes(stateCodes) {
  return {
    stateCode: {
      [Op.not]: stateCodes,
    },
  };
}
