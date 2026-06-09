import { Op } from 'sequelize';
import { compareDate, withinDateRange } from '../utils';

export function beforeCreateDate(date: string[]) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'createdAt', Op.lt),
    },
  };
}

export function afterCreateDate(date: string[]) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'createdAt', Op.gt),
    },
  };
}

export function withinCreateDate(dates: string[]) {
  return {
    [Op.and]: {
      [Op.or]: withinDateRange(dates, 'createdAt'),
    },
  };
}
