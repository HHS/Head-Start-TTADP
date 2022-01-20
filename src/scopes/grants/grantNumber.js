import { Op } from 'sequelize';

export function withGrantNumber(grantNumber) {
  const normalizedgrantNumber = `%${grantNumber}%`;
  return {
    number: {
      [Op.iLike]: normalizedgrantNumber,
    },
  };
}

export function withoutGrantNumber(grantNumber) {
  const normalizedgrantNumber = `%${grantNumber}%`;
  return {
    number: {
      [Op.notILike]: normalizedgrantNumber,
    },
  };
}
