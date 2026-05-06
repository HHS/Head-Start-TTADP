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
    conductMethod: {
      [Op.notIn]: methods,
    },
  };
}
