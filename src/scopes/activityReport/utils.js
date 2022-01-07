import { Op } from 'sequelize';
import { sequelize } from '../../models';

function expandArray(column, searchTerms, operator) {
  return searchTerms.map((term) => sequelize.literal(`${column} ${operator} ${sequelize.escape(`%${term}%`)}`));
}

function reportInSubQuery(baseQuery, searchTerms, operator, comparator) {
  return searchTerms.map((term) => sequelize.literal(`"ActivityReport"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(`%${term}%`)}`));
}

export default function filterArray(column, searchTerms, exclude) {
  if (exclude) {
    return {
      [Op.or]: [
        {
          [Op.and]: expandArray(column, searchTerms, 'NOT ILIKE'),
        },
        sequelize.literal(`${column} IS NULL`),
      ],
    };
  }
  return {
    [Op.or]: expandArray(column, searchTerms, 'ILIKE'),
  };
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
 * @param {*} comparator default ILIKE
 * what is used to compare the end of the baseQuery to the searchTerm
 * @returns an object in the style of a sequelize where clause
 */

export function filterAssociation(baseQuery, searchTerms, exclude, comparator = 'ILKE') {
  if (exclude) {
    return {
      [Op.and]:
        reportInSubQuery(baseQuery, searchTerms, 'NOT IN', comparator),
    };
  }

  return {
    [Op.or]: reportInSubQuery(baseQuery, searchTerms, 'IN', comparator),
  };
}
