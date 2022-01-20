import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const programTypeFilter = 'SELECT "grantId" FROM "Programs" WHERE "programType';

export function withProgramTypes(types) {
  return {
    [Op.or]: [
      filterAssociation(programTypeFilter, types, false),
    ],
  };
}

export function withoutProgramTypes(types) {
  return {
    [Op.and]: [
      filterAssociation(programTypeFilter, types, true),
    ],
  };
}
