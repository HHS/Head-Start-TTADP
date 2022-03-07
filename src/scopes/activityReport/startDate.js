import { Op } from 'sequelize';
import { withinDateRange, compareDate } from '../utils';

export function beforeStartDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'startDate', Op.lte),
    },
  };
}

export function afterStartDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'startDate', Op.gte),
    },
  };
}

export function withinStartDates(dates) {
  return {
    [Op.and]: {
      [Op.or]: withinDateRange(dates, 'startDate'),
    },
  };
}
