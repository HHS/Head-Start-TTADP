import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { filterAssociation } from '../utils';

const programTypeFilter = `
SELECT "Programs"."grantId"
FROM "Programs" "Programs"
WHERE "Programs"."programType"`;

function subQuery(baseQuery, searchTerms, operator, comparator) {
  return searchTerms.map((term) => sequelize.literal(`"grants"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(`${term}`)})`));
}

export function withProgramTypes(types) {
  return {
    [Op.or]: [
      filterAssociation(programTypeFilter, types, false, subQuery, '='),
    ],
  };
}

export function withoutProgramTypes(types) {
  return {
    [Op.and]: [
      filterAssociation(programTypeFilter, types, true, subQuery, '='),
    ],
  };
}
