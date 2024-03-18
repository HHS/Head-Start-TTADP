import { sequelize } from '../../models';
import { filterAssociation as filter } from '../utils';

export function grantInSubQuery(
  baseQuery: string,
  searchTerms: string[],
  operator: string,
  comparator: 'LIKE' | 'NOT LIKE' | '~*' | '!~*' | 'ILIKE' | 'NOT ILIKE' = 'LIKE',
) {
  return searchTerms.map((term) => sequelize.literal(`"Grant"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(String(term).trim())})`));
}

export function filterAssociation(baseQuery: string, searchTerms: string[], exclude: boolean, comparator = 'LIKE') {
  return filter(baseQuery, searchTerms, exclude, grantInSubQuery, comparator);
}
