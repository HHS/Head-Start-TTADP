import { Op } from 'sequelize';

export function withConductMethod(methods: string[]) {
  return {
    conductMethod: {
      [Op.in]: methods,
    },
  };
}

export function withoutConductMethod(methods: string[]) {
  return {
    [Op.or]: [
      {
        conductMethod: {
          [Op.notIn]: methods,
        },
      },
      {
        conductMethod: null,
      },
    ],
  };
}
