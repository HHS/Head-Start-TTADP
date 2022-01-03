import { Op } from 'sequelize';
import { withinDateRange, compareDate } from '../utils';

export function beforeGrantStartDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'startDate', Op.lt),
    },
  };
}

export function afterGrantStartDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'startDate', Op.gt),
    },
  };
}

export function withinGrantStartDates(dates) {
  return {
    [Op.and]: {
      [Op.or]: withinDateRange(dates, 'startDate'),
    },
  };
}
