import { Op, WhereOptions } from 'sequelize';

const ENUM = {
  RTTAPA: 'Yes',
  'Non-RTTAPA': 'No',
};

const filterQuery = (query: string[]): string[] => query
  .filter((q) => q && ENUM[q])
  .map((q) => ENUM[q]);

export function withGoalType(query: string[]): WhereOptions {
  const filteredQuery = filterQuery(query);
  if (!filteredQuery.length) {
    return {};
  }

  return {
    isRttapa: {
      [Op.in]: filteredQuery,
    },
  };
}

export function withoutGoalType(query: string[]): WhereOptions {
  const filteredQuery = filterQuery(query);
  if (!filteredQuery.length) {
    return {};
  }

  return {
    [Op.or]: [
      {
        isRttapa: {
          [Op.notIn]: filteredQuery,
        },
      },
      {
        isRttapa: null,
      },
    ],
  };
}
