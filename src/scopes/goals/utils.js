/* eslint-disable import/prefer-default-export */
import { sequelize } from '../../models';
import { filterAssociation as filter } from '../utils';

function goalInSubQuery(baseQuery, searchTerms, operator, comparator, escape = true) {
  if (comparator.toLowerCase() === 'between') {
    const [min, max] = searchTerms;
    return {
      [operator]: sequelize.literal(`"Goal"."id" ${operator} (${baseQuery} ${comparator} ${min} AND ${max})`),
    };
  }

  if (!escape) {
    return searchTerms.map((term) => sequelize.literal(`"Goal"."id" ${operator} (${baseQuery} ${comparator} ${String(term).trim()})`));
  }

  return searchTerms.map((term) => sequelize.literal(`"Goal"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(String(term).trim())})`));
}

/**
 * @param {*} baseQuery baseQuery should be a SQL statement up to and
 * including the end of a final where
 * @param {*} searchTerms an array of search terms from the query string
 * @param {*} exclude whether this should exclude or include goals
 * @param {*} comparator default ~*
 * what is used to compare the end of the baseQuery to the searchTerm
 * @param {boolean} escape When true, call sequelize.escape on the searchTerms.
 * @returns an object in the style of a sequelize where clause
 */

export function filterAssociation(baseQuery, searchTerms, exclude, comparator = '~*', escape = true) {
  return filter(baseQuery, searchTerms, exclude, goalInSubQuery, comparator, escape);
}
