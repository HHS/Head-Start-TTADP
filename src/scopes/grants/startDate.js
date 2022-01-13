import { Op } from 'sequelize';

export function beforeGrantStartDate(dates) {
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

export function afterGrantStartDate(dates) {
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

export function withinGrantStartDates(dates) {
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
