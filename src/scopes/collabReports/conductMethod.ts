import { Op } from 'sequelize';

const VALID_CONDUCT_METHODS = ['email', 'phone', 'in_person', 'virtual'];

function isValidConductMethod(method: string): boolean {
  return VALID_CONDUCT_METHODS.includes(method);
}

export function withConductMethod(methods: string[]) {
  if (
    !methods ||
    !Array.isArray(methods) ||
    methods.length === 0 ||
    !methods.every(isValidConductMethod)
  ) {
    return {};
  }
  return {
    conductMethod: {
      [Op.in]: methods,
    },
  };
}

export function withoutConductMethod(methods: string[]) {
  if (
    !methods ||
    !Array.isArray(methods) ||
    methods.length === 0 ||
    !methods.every(isValidConductMethod)
  ) {
    return {};
  }
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
