import { Op } from 'sequelize';

export function beforeCreateDate(date) {
  return {
    createdAt: {
      [Op.lt]: new Date(date),
    },
  };
}

export function afterCreateDate(date) {
  return {
    createdAt: {
      [Op.gt]: new Date(date),
    },
  };
}

export function withinCreateDate(startDate, endDate) {
  if (!startDate || !endDate) {
    return {
      startDate: {},
    };
  }
  return {

    createdAt: {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    },
  };
}
