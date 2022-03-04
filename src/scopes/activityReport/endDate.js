import { Op } from 'sequelize';
import { withinDateRange, compareDate } from '../utils';

export function beforeEndDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'endDate', Op.lte),
    },
  };
}

export function afterEndDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'endDate', Op.gte),
    },
  };
}

export function withinEndDate(dates) {
  return {
    [Op.and]: {
      [Op.or]: withinDateRange(dates, 'endDate'),
    },
  };
}
