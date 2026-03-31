import { Op } from 'sequelize';

export function activeBefore(dates) {
  const scopes = dates.reduce((acc, date) => [
    ...acc,
    {
      initial_report_delivery_date: {
        [Op.lte]: new Date(date),
      },
    },
  ], []);

  return {
    where: {
      [Op.or]: scopes,
    },
  };
}

export function activeAfter(dates) {
  const scopes = dates.reduce((acc, date) => [
    ...acc,
    {
      active_through: {
        [Op.gte]: new Date(date),
      },
    },
  ], []);

  return {
    [Op.or]: scopes,
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
        initial_report_delivery_date: {
          [Op.lte]: new Date(ed),
        },
        active_through: {
          [Op.gte]: new Date(sd),
        },
      },
    ];
  }, []);

  return {
    [Op.or]: scopes,
  };
}
