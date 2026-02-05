import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { filterAssociation, filterToAllowedProgramTypes } from '../utils';

const programTypeFilter = `
SELECT "Programs"."grantId"
FROM "Programs" "Programs"
WHERE "Programs"."programType"`;

function subQuery(baseQuery, searchTerms, operator, comparator) {
  return searchTerms.map((term) => sequelize.literal(`"grants"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(`${term}`)})`));
}

export function withProgramTypes(types) {
  const allowedTypes = filterToAllowedProgramTypes(types);
  return {
    where: {
      [Op.or]: [
        filterAssociation(programTypeFilter, allowedTypes, false, subQuery, '='),
      ],
    },
  };
}

export function withoutProgramTypes(types) {
  const allowedTypes = filterToAllowedProgramTypes(types);
  return {
    where: {
      [Op.and]: [
        filterAssociation(programTypeFilter, allowedTypes, true, subQuery, '='),
      ],
    },
  };
}
