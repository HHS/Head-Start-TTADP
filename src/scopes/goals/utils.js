/* eslint-disable import/prefer-default-export */
import { sequelize } from '../../models';
import { filterAssociation as filter } from '../utils';

function goalInSubQuery(baseQuery, searchTerms, operator, comparator) {
  return searchTerms.map((term) => sequelize.literal(`"Goal"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(term)})`));
}

/**
 * @param {*} baseQuery baseQuery should be a SQL statement up to and
 * including the end of a final where
 * @param {*} searchTerms an array of search terms from the query string
 * @param {*} exclude whether this should exclude or include goals
 * @param {*} comparator default ~*
 * what is used to compare the end of the baseQuery to the searchTerm
 * @returns an object in the style of a sequelize where clause
 */

export function filterAssociation(baseQuery, searchTerms, exclude, comparator = '~*') {
  return filter(baseQuery, searchTerms, exclude, goalInSubQuery, comparator);
}
