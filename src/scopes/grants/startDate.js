import { Op } from 'sequelize';

export function beforeStartDate(dates) {
  return dates.reduce((acc, date) => [
    ...acc,
    {
      [Op.and]: [
        {
          startDate: {
            [Op.lte]: date,
          },
        },
        {
          endDate: {
            [Op.gte]: date,
          },
        },
      ],
    },
  ], []);
}

export function afterStartDate(dates) {
  return dates.reduce((acc, date) => [
    ...acc,
    {
      [Op.and]: {
        startDate: {
          [Op.gte]: date,
        },
        status: 'Active',
      },
    },
  ], []);
}

export function withinStartDates(dates) {
  return dates.reduce((acc, range) => {
    if (!range.split) {
      return acc;
    }

    const [startDate, endDate] = range.split('-');
    if (!startDate || !endDate) {
      return acc;
    }

    return [
      ...acc,
      {
        [Op.and]: {
          startDate: {
            [Op.lte]: startDate,
          },
          endDate: {
            [Op.gte]: endDate,
          },
        },
      },
    ];
  }, []);
}
