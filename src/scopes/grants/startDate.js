import { Op } from 'sequelize';

export function beforeGrantStartDate(date) {
  return {
    startDate: {
      [Op.lt]: new Date(date),
    },
  };
}

export function afterGrantStartDate(date) {
  return {
    startDate: {
      [Op.gt]: new Date(date),
    },
  };
}

export function withinGrantStartDates(startDate, endDate) {
  if (!startDate || !endDate) {
    return {
      startDate: {},
    };
  }

  return {
    startDate: {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    },
  };
}
