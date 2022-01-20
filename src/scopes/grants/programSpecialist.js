import { Op } from 'sequelize';

export function withProgramSpecialist(name) {
  return {
    programSpecialistName: {
      [Op.in]: name,
    },
  };
}

export function withoutProgramSpecialist(name) {
  return {
    programSpecialistName: {
      [Op.not]: name,
    },
  };
}
