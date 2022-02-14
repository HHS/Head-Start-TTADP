import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { filterAssociation } from '../utils';

const programTypeFilter = 'SELECT "grantId" FROM "Programs" WHERE "programType"';

function subQuery(baseQuery, searchTerms, operator, comparator) {
  return searchTerms.map((term) => sequelize.literal(`"Grant"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(`${term}`)})`));
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
