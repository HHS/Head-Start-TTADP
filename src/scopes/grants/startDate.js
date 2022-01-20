import { Op } from 'sequelize';
import { withinDateRange, compareDate } from '../utils';

export function beforeStartDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'startDate', Op.lt),
    },
  };
}

export function afterStartDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'startDate', Op.gt),
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
