import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { filterAssociation as filter } from '../utils';

/**
 * Expands an array of search terms into an array of Sequelize literal expressions.
 * @param {string} column - The column to search in.
 * @param {Array<any>} searchTerms - The array of search terms.
 * @param {string} operator - The operator to use for comparison.
 * @returns {Array<Sequelize.literal>} - The array of Sequelize literal expressions.
 */
const expandArray = (
  column:string, // The column to search in.
  searchTerms, // The array of search terms.
  operator:string, // The operator to use for comparison.
) => searchTerms
  .map((term) => sequelize // Mapping each search term to a Sequelize literal expression.
    .literal(`${column} ${operator} ${sequelize.escape(`%${String(term).trim()}%`)}`));

/**
 * Constructs a subquery for searching a specific column in a base query using search terms.
 * @param {string} baseQuery - The base query to be used in the subquery.
 * @param {Array<string>} searchTerms - An array of search terms.
 * @param {string} operator - The operator to be used in the subquery.
 * @param {string} comparator - The comparator to be used in the subquery.
 * @param {boolean} escape - Indicates whether the search terms should be escaped.
 * @param {string} column - The column to be searched. Defaults to '"Report".id'.
 * @returns {Array<string>} - An array of subqueries for each search term.
 */
const columnInSubQuery = (
  baseQuery,
  searchTerms,
  operator,
  comparator:string,
  escape,
  column = '"Report".id',
) => {
  switch (comparator.toUpperCase()) {
    case 'IN':
    case 'NOT IN':
      return sequelize // Mapping each search term to a Sequelize literal expression.
        .literal(`${column} ${operator} (${baseQuery} ${comparator} (${
          searchTerms.every((st) => typeof st === 'number')
            ? searchTerms.join(', ')
            : searchTerms
              .map((st) => sequelize.escape(String(st).trim()))
              .join(', ')
        }))`);
      break;
    default:
      return searchTerms
        .map((term) => sequelize // Mapping each search term to a Sequelize literal expression.
          .literal(`${column} ${operator} (${baseQuery} ${comparator} ${sequelize.escape(String(term).trim())})`));
  }
};

/**
 * Filters an array based on search terms and conditions.
 *
 * @param {string} column - The column to filter on.
 * @param {string[]} searchTerms - The search terms to filter with.
 * @param {boolean} exclude - Whether to exclude the filtered results.
 * @param {string} includeOperator - The operator to use for inclusion (default: Op.or).
 * @param {string} excludeOperator - The operator to use for exclusion (default: Op.and).
 * @param {function} arrayExpansion - The function to expand the array (default: expandArray).
 * @returns {object} - The filter object.
 */
const filterArray = (
  column,
  searchTerms,
  exclude,
  includeOperator = Op.or,
  excludeOperator = Op.and,
  arrayExpansion = expandArray,
) => {
  // Check if exclude is true
  if (exclude) {
    return {
      [Op.or]: [
        // Apply the excludeOperator to the array expansion of column, searchTerms, and 'NOT ILIKE'
        {
          [excludeOperator]: arrayExpansion(column, searchTerms, 'NOT ILIKE'),
        },
        // Include records where column is null
        sequelize.literal(`${column} IS NULL`),
      ],
    };
  }

  // Return the includeOperator applied to the array expansion of column, searchTerms, and 'ILIKE'
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
  baseQuery: string,
  searchTerms,
  options?: {
    callback?,
    exclude?: boolean,
    comparator?: string, // TODO: make this an enumeration
    escape?: boolean,
    column?: string,
  },
) => {
  const {
    callback = columnInSubQuery,
    exclude = false,
    comparator = '~*',
    escape = true,
    column = '"Report".id',
  } = options;

  console.log('*********************', callback(
    baseQuery,
    searchTerms,
    exclude
      ? 'NOT IN'
      : 'IN',
    comparator,
    escape,
    column,
  ));

  return ({
    [Op.and]: callback(
      baseQuery,
      searchTerms,
      exclude
        ? 'NOT IN'
        : 'IN',
      comparator,
      escape,
      column,
    ),
  });
};

export {
  expandArray,
  columnInSubQuery as reportInSubQuery,
  filterArray,
  filterAssociation,
};
