import { Op } from 'sequelize';
import { argsIncludeExclude, filterAssociation } from './utils';

export function withGoalName(searchText: string[]) {
  const search = [`%${searchText.map((st: string) => st.toLowerCase())}%`];

  return {
    [Op.and]: [filterAssociation(argsIncludeExclude(true), search, false, 'LIKE')],
  };
}

export function withoutGoalName(searchText: string[]) {
  const search = [`%${searchText.map((st) => st.toLowerCase())}%`];

  return {
    [Op.and]: [filterAssociation(argsIncludeExclude(false), search, false, 'NOT LIKE')],
  };
}
