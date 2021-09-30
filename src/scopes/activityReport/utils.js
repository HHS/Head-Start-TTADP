import { Op } from 'sequelize';
import { sequelize } from '../../models';

function expandArray(column, searchTerms, operator) {
  return searchTerms.map((term) => sequelize.literal(`${column} ${operator} ${sequelize.escape(term)}`));
}

function reportInSubQuery(baseQuery, searchTerms, operator, comparator) {
  return searchTerms.map((term) => sequelize.literal(`"ActivityReport"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(term)})`));
}

export default function filterArray(column, searchTerms, exclude) {
  if (exclude) {
    return {
      [Op.or]: [
        ...expandArray(column, searchTerms, '!~*'),
        sequelize.literal(`${column} IS NULL`),
      ],
    };
  }
  return {
    [Op.and]: expandArray(column, searchTerms, '~*'),
  };
}

export function filterAssociation(baseQuery, searchTerms, exclude, comparator = '~*') {
  if (exclude) {
    return {
      [Op.and]:
        reportInSubQuery(baseQuery, searchTerms, 'NOT IN', comparator),
    };
  }

  return {
    [Op.and]: reportInSubQuery(baseQuery, searchTerms, 'IN', comparator),
  };
}
