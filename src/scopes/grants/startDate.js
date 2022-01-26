import { Op } from 'sequelize';
import { compareDate } from '../utils';

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

export function activeWithinDates(dates) {
  const scopes = dates.reduce((acc, range) => {
    if (!range.split) {
      return acc;
    }

    const [sd, ed] = range.split('-');
    if (!sd || !ed) {
      return acc;
    }

    return [
      ...acc,
      {
        startDate: {
          [Op.lte]: new Date(ed),
        },
        endDate: {
          [Op.gte]: new Date(sd),
        },
      },
    ];
  }, []);

  return {
    [Op.or]: scopes,
  };
}
