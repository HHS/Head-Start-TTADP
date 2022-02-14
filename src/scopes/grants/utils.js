import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { filterAssociation as filter } from '../utils';

function grantInSubQuery(baseQuery, searchTerms, operator, comparator) {
  return searchTerms.map((term) => sequelize.literal(`"Grant"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(`%${term}%`)})`));
}

export function expandArrayContains(key, array, exclude) {
  const comparator = exclude ? Op.notILike : Op.iLike;
  const scopes = array.map((member) => {
    const normalizedMember = `%${member}%`;
    return {
      [key]: {
        [comparator]: normalizedMember, // sequelize escapes this automatically :)
      },
    };
  });

  return {
    [Op.or]: scopes,
  };
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

export function filterAssociation(baseQuery, searchTerms, exclude, comparator = 'ILIKE') {
  return filter(baseQuery, searchTerms, exclude, grantInSubQuery, comparator);
}
