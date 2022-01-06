import { Op } from 'sequelize';
import { withinDateRange, compareDate } from '../utils';

export function beforeLastSaveDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'updatedAt', Op.lt),
    },
  };
}

export function afterLastSaveDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'updatedAt', Op.gt),
    },
  };
}

export function withinLastSaveDates(dates) {
  return {
    [Op.and]: {
      [Op.or]: withinDateRange(dates, 'updatedAt'),
    },
  };
}
