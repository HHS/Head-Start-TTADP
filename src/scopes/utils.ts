import { Op, WhereOptions } from 'sequelize';
import { map, pickBy } from 'lodash';
import { DECIMAL_BASE } from '@ttahub/common';

/**
 * Takes an array of string date ranges (2020/09/01-2021/10/02, for example)
 * and attempts to turn them into something sequelize can understand
 *
 * @param {String[]} dates
 * @param {String} property
 * @param {string} Operator (a sequelize date operator)
 * @returns an array meant to be folded in an Op.and/Op.or sequelize expression
 */
export function compareDate(dates: string[], property: string, operator: string): WhereOptions[] {
  return dates.reduce((acc, date) => [
    ...acc,
    {
      [property]: {
        [operator]: date,
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
export function withinDateRange(dates: string[], property: string): WhereOptions[] {
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
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
    ];
  }, []);
}

export function createFiltersToScopes(filters, topicToQuery, options, userId) {
  const validFilters = pickBy(filters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    if (!(topic in topicToQuery)) {
      return false;
    }
    return condition in topicToQuery[topic];
  });

  return map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    return topicToQuery[topic][condition]([query].flat(), options, userId);
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

export function filterAssociation(baseQuery, searchTerms, exclude, callback, comparator = '~*', escape = true) {
  if (exclude) {
    return {
      where: {
        [Op.and]: callback(baseQuery, searchTerms, 'NOT IN', comparator, escape),
      },
    };
  }

  return {
    where: {
      [Op.or]: callback(baseQuery, searchTerms, 'IN', comparator, escape),
    },
  };
}

export const idClause = (query: string[]) => query.filter((id: string) => !Number.isNaN(parseInt(id, DECIMAL_BASE))).join(',');

/**
 * Extracts the WHERE clause from a Sequelize model's findAll query and replaces the model name
 * with an alias.
 * @param model - The Sequelize model to query.
 * @param alias - The alias to replace the model name with.
 * @param scope - The WHERE options for the query.
 * @returns The modified WHERE clause as a string.
 */
export const scopeToWhere = async (
  model,
  alias: string,
  scope: WhereOptions,
): Promise<string> => {
  let sql = '';
  // The db is not connected for this query as the limit is set to zero, it just returns.
  await model.findAll({
    where: scope,
    limit: 0,
    logging: (x) => { sql = x; },
  });

  // Extract the WHERE clause from the SQL query
  const where = sql
    .substring(sql.indexOf('WHERE') + 'WHERE'.length + 1)
    .replace(/\sLIMIT\s0;$/, '')
    .replace(new RegExp(`"${model.name}"`, 'g'), alias);

  return where;
};
