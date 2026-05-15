import { Op } from 'sequelize';

type ActivityTypeValue = 'state' | 'regional';

const VALID_ACTIVITY_TYPES: ActivityTypeValue[] = ['state', 'regional'];

function isValidActivityType(type: string): type is ActivityTypeValue {
  return VALID_ACTIVITY_TYPES.includes(type as ActivityTypeValue);
}

export function withActivityType(types: string[]) {
  if (!types || !Array.isArray(types) || types.length === 0 || !types.every(isValidActivityType)) {
    return {};
  }

  const isStateActivityValues = types.map((type) => type === 'state');

  return {
    isStateActivity: {
      [Op.in]: isStateActivityValues,
    },
  };
}

export function withoutActivityType(types: string[]) {
  if (!types || !Array.isArray(types) || types.length === 0 || !types.every(isValidActivityType)) {
    return {};
  }

  const isStateActivityValues = types.map((type) => type === 'state');

  return {
    [Op.or]: [
      {
        isStateActivity: {
          [Op.notIn]: isStateActivityValues,
        },
      },
      {
        isStateActivity: {
          [Op.is]: null,
        },
      },
    ],
  };
}
