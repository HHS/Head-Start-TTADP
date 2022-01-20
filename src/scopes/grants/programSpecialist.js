import { Op } from 'sequelize';

export function withProgramSpecialistName(name) {
  return {
    programSpecialistName: {
      [Op.in]: name,
    },
  };
}

export function withoutProgramSpecialistName(name) {
  return {
    programSpecialistName: {
      [Op.not]: name,
    },
  };
}
