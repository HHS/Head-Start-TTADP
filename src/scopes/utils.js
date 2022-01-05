/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';

/**
 * Takes an array of string date ranges (2020/09/01-2021/10/02, for example)
 * and attempts to turn them into something sequelize can understand
 *
 * @param {String[]} dates
 * @param {String} property
 * @param {Op.gt || Op.lt} Operator (a sequelize date operator)
 * @returns an array meant to be folded in an Op.and/Op.or sequelize expression
 */
export function compareDate(dates, property, operator) {
  return dates.reduce((acc, date) => [
    ...acc,
    {
      [property]: {
        [operator]: new Date(date),
      },
    },
  ], []);
}

/**
 * Takes an array of string date ranges (2020/09/01-2021/10/02, for example)
 * and attempts to turn them into something sequelize can understand
 *
 * @param {String[]} dates
 * @param {String} property
 * @returns an array meant to be folded in an Op.and/Op.or sequelize expression
 */
export function withinDateRange(dates, property) {
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
        [property]: {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        },
      },
    ];
  }, []);
}
