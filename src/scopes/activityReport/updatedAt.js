import { Op } from 'sequelize';

export function beforeLastSaveDate(date) {
  return {
    updatedAt: {
      [Op.lt]: new Date(date),
    },
  };
}

export function afterLastSaveDate(date) {
  return {
    updatedAt: {
      [Op.gt]: new Date(date),
    },
  };
}

export function withinLastSaveDates(startDate, endDate) {
  return {
    updatedAt: {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    },
  };
}
