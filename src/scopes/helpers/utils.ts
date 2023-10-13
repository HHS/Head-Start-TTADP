import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { filterAssociation as filter } from '../utils';

const expandArray = (
  column,
  searchTerms,
  operator,
) => searchTerms
  .map((term) => sequelize
    .literal(`${column} ${operator} ${sequelize.escape(`%${String(term).trim()}%`)}`));

const columnInSubQuery = (
  baseQuery,
  searchTerms,
  operator,
  comparator,
  escape,
  column = '"Report".id',
) => searchTerms
  .map((term) => sequelize
    .literal(`${column} ${operator} (${baseQuery} ${comparator} ${sequelize.escape(String(term).trim())})`));

const filterArray = (
  column,
  searchTerms,
  exclude,
  includeOperator = Op.or,
  excludeOperator = Op.and,
  arrayExpansion = expandArray,
) => {
  if (exclude) {
    return {
      [Op.or]: [
        {
          [excludeOperator]: arrayExpansion(column, searchTerms, 'NOT ILIKE'),
        },
        sequelize.literal(`${column} IS NULL`),
      ],
    };
  }
  return {
    [includeOperator]: arrayExpansion(column, searchTerms, 'ILIKE'),
  };
};

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

const filterAssociation = (
  baseQuery,
  searchTerms,
  exclude,
  callback = columnInSubQuery,
  comparator = '~*',
  escape = true,
  column = '"Report".id',
) => ((exclude)
  ? {
    [Op.and]: callback(baseQuery, searchTerms, 'NOT IN', comparator, escape, column),
  }
  : {
    [Op.and]: callback(baseQuery, searchTerms, 'NOT IN', comparator, escape, column),
  });

export {
  expandArray,
  columnInSubQuery as reportInSubQuery,
  filterArray,
  filterAssociation,
};
