import { Op } from 'sequelize';
import { compareDate, withinDateRange } from '../utils';

export function beforeCompleteDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'complete_date', Op.lte),
    },
  };
}

export function afterCompleteDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'complete_date', Op.gte),
    },
  };
}

export function withinCompleteDates(dates) {
  return {
    [Op.and]: {
      [Op.or]: withinDateRange(dates, 'complete_date'),
    },
  };
}
