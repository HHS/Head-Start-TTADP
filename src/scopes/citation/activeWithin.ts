import { Op } from 'sequelize';
import { normalizeDateInput } from '../utils';

export function activeBefore(dates) {
  const scopes = dates.reduce((acc, date) => {
    const normalized = normalizeDateInput(date, 'end');
    if (!normalized) {
      return acc;
    }

    return [
      ...acc,
      {
        initial_report_delivery_date: {
          [Op.lte]: normalized,
        },
      },
    ];
  }, []);

  return {
    where: {
      [Op.or]: scopes,
    },
  };
}

export function activeAfter(dates) {
  const scopes = dates.reduce((acc, date) => {
    const normalized = normalizeDateInput(date, 'start');
    if (!normalized) {
      return acc;
    }

    return [
      ...acc,
      {
        active_through: {
          [Op.gte]: normalized,
        },
      },
    ];
  }, []);

  return {
    [Op.or]: scopes,
  };
}

export function activeWithinDates(dates) {
  const scopes = dates.reduce((acc, range) => {
    if (!range.split) {
      return acc;
    }

    const splitDates = range.split('-');
    if (splitDates.length !== 2) {
      return acc;
    }

    const [sd, ed] = splitDates;
    if (!sd || !ed) {
      return acc;
    }

    const normalizedStartDate = normalizeDateInput(sd, 'start');
    const normalizedEndDate = normalizeDateInput(ed, 'end');
    if (!normalizedStartDate || !normalizedEndDate) {
      return acc;
    }

    return [
      ...acc,
      {
        initial_report_delivery_date: {
          [Op.lte]: normalizedEndDate,
        },
        active_through: {
          [Op.gte]: normalizedStartDate,
        },
      },
    ];
  }, []);

  return {
    [Op.or]: scopes,
  };
}
