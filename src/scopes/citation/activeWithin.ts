import { Op } from 'sequelize';
import { dateInputForQuery } from '../utils';

export function activeBefore(dates) {
  const scopes = dates.reduce((acc, date) => {
    const queryDate = dateInputForQuery(date, 'end');
    if (!queryDate) {
      return acc;
    }

    return [
      ...acc,
      {
        initial_report_delivery_date: {
          [Op.lte]: queryDate,
        },
      },
    ];
  }, []);

  return {
    [Op.or]: scopes,
  };
}

export function activeAfter(dates) {
  const scopes = dates.reduce((acc, date) => {
    const queryDate = dateInputForQuery(date, 'start');
    if (!queryDate) {
      return acc;
    }

    return [
      ...acc,
      {
        active_through: {
          [Op.gte]: queryDate,
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

    const startDateForQuery = dateInputForQuery(sd, 'start');
    const endDateForQuery = dateInputForQuery(ed, 'end');
    if (!startDateForQuery || !endDateForQuery) {
      return acc;
    }

    return [
      ...acc,
      {
        initial_report_delivery_date: {
          [Op.lte]: endDateForQuery,
        },
        active_through: {
          [Op.gte]: startDateForQuery,
        },
      },
    ];
  }, []);

  return {
    [Op.or]: scopes,
  };
}
