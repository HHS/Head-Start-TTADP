import { Op } from 'sequelize';
import { withinDateRange, compareDate } from '../utils';

export function beforeCreateDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'createdAt', Op.lt),
    },
  };
}

export function afterCreateDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'createdAt', Op.gt),
    },
  };
}

export function withinCreateDate(dates) {
  return {
    [Op.and]: {
      [Op.or]: withinDateRange(dates, 'createdAt'),
    },
  };
}
