import { Op } from 'sequelize';
import { map, pickBy } from 'lodash';

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
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate),
        },
      },
    ];
  }, []);
}

export function createFiltersToScopes(filters, topicToQuery) {
  const validFilters = pickBy(filters, (query, topicAndCondition) => {
    const [topic] = topicAndCondition.split('.');
    return topic in topicToQuery;
  });

  return map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    return topicToQuery[topic][condition]([query].flat());
  });
}

/**
 *
 *  baseQuery should be a SQL statement up to and including the end of a final where
 *  for example
 *
 * 'SELECT "ActivityReportCollaborators"."activityReportId" FROM "Users"
 *  INNER JOIN "ActivityReportCollaborators"
 *  ON "ActivityReportCollaborators"."userId" = "Users"."id"
 *  WHERE "Users".name'
 *
 * Assuming this is to get all matching reports, when this is passed to
 * reportInSubQuery, it will be transformed and executed as
 *
 * "ActivityReport"."id" IN (
 *    'SELECT "ActivityReportCollaborators"."activityReportId" FROM "Users"
 *     INNER JOIN "ActivityReportCollaborators"
 *     ON "ActivityReportCollaborators"."userId" = "Users"."id"
 *     WHERE "Users".name' ~* "Name")`
 * Where that final name is one of the members of the searchTerms array
 *
 * @param {*} baseQuery a partial sql statement
 * @param {*} searchTerms an array of search terms from the query string
 * @param {*} exclude whether this should exclude or include reports
 * @param {*} comparator default ~*
 * what is used to compare the end of the baseQuery to the searchTerm
 * @returns an object in the style of a sequelize where clause
 */

export function filterAssociation(baseQuery, searchTerms, exclude, callback, comparator = '~*') {
  if (exclude) {
    return {
      [Op.and]: callback(baseQuery, searchTerms, 'NOT IN', comparator),
    };
  }

  return {
    [Op.or]: callback(baseQuery, searchTerms, 'IN', comparator),
  };
}
