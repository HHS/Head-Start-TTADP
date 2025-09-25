/* eslint-disable import/prefer-default-export */
import { sequelize } from '../../models';
import { filterAssociation as filter } from '../utils';

function reportInSubQuery(baseQuery, searchTerms, operator, comparator) {
  return searchTerms.map((term) => sequelize.literal(`"TrainingReport"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(String(term).trim())})`));
}

export function filterAssociation(baseQuery, searchTerms, exclude, comparator = '~*') {
  return filter(baseQuery, searchTerms, exclude, reportInSubQuery, comparator);
}
