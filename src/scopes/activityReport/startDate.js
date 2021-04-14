import { Op } from 'sequelize';

export function beforeStartDate(date) {
  return {
    startDate: {
      [Op.lt]: new Date(date),
    },
  };
}

export function afterStartDate(date) {
  return {
    startDate: {
      [Op.gt]: new Date(date),
    },
  };
}

export function withinStartDates(startDate, endDate) {
  return {
    startDate: {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    },
  };
}
