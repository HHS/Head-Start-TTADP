import { Op } from 'sequelize';

function getValidConductMethods(): string[] {
  const { CollabReport } = require('../../models');
  const values = CollabReport?.rawAttributes?.conductMethod?.values;

  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('CollabReport.conductMethod enum values are unavailable');
  }

  return values;
}

const VALID_CONDUCT_METHODS = getValidConductMethods();

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
