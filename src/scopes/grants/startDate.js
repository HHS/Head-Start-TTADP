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

export function withinStartDates(dates) {
  const scopes = dates.reduce((acc, range) => {
    if (!range.split) {
      return acc;
    }

    const [sd, ed] = range.split('-');
    if (!sd || !ed) {
      return acc;
    }

    return [
      // scenario: Grant runs from 08/01/1997-08/02/2002

      // this covers a date range of '07/31/1997-08/03/2002'
      // that is, a range that includes the entire life of the grant
      {
        startDate: {
          [Op.lt]: new Date(ed),
          [Op.gte]: new Date(sd),
        },
        endDate: {
          [Op.gt]: new Date(sd),
          [Op.lte]: new Date(ed),
        },
      },

      // this covers a date range of '08/04/1997-08/03/2002'
      // that is, a date range where the start date of the date range is after
      // the start date of the grant but the end date of the range is after the end
      // date of the grant
      {
        startDate: {
          [Op.gte]: new Date(sd),
          [Op.lte]: new Date(ed),
        },
        endDate: {
          [Op.gte]: new Date(ed),
        },
      },

      // this covers a date range of '08/04/1997-08/03/2000'
      // that is, where the start and end date of the range are
      // within the start and end date of the grant
      {
        startDate: {
          [Op.lte]: new Date(sd), // 08/01/1997 is less than 08/04/1997
        },
        endDate: {
          [Op.gt]: new Date(sd),
          [Op.lte]: new Date(ed), // 08/02/2002 is greater than 08/03/2000
        },
      },

      // if it started before the end date and hasn't ended yet, basically
      {
        startDate: {
          [Op.lte]: new Date(ed),
        },
        endDate: {
          [Op.gt]: new Date(sd),
        },
      },
      {
        startDate: {
          [Op.gte]: new Date(sd),
          [Op.lte]: new Date(ed),
        },
        endDate: {
          [Op.gte]: new Date(ed),
        },
      },
    ];
  }, []);

  return {
    [Op.and]: {
      [Op.or]: scopes,
    },
  };
}
