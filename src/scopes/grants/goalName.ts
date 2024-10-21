import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const selectDistinctGrants = (join: string, having: string) => `
  SELECT DISTINCT
    "Grants"."id"
  FROM "Grants"
  ${join}
  GROUP BY "Grants"."id"
  HAVING ${having}`;

const goalNameIncludeExclude = (include = true) => {
  const a = include ? '' : 'bool_or("Goals".name IS NULL) OR';

  return selectDistinctGrants(
    'LEFT JOIN "Goals" ON "Goals"."grantId" = "Grants"."id"',
    `${a} LOWER(STRING_AGG("Goals".name, CHR(10)))`,
  );
};

export function withGoalName(searchText: string[]) {
  const search = [`${searchText.map((st) => st.toLowerCase())}`];

  return {
    where: {
      [Op.or]: [
        filterAssociation(goalNameIncludeExclude(true), search, false, 'LIKE'),
      ],
    },
  };
}

export function withoutGoalName(searchText: string[]) {
  const search = [`${searchText.map((st) => st.toLowerCase())}`];
  return {
    where: {
      [Op.and]: [
        filterAssociation(goalNameIncludeExclude(false), search, false, 'NOT LIKE'),
      ],
    },
  };
}
