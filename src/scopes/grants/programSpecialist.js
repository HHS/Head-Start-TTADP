import { Op } from 'sequelize';

export function withProgramSpecialist(name) {
  const normalizedName = `%${name}%`;

  return {
    programSpecialistName: {
      [Op.iLike]: normalizedName,
    },
  };
}

export function withoutProgramSpecialist(name) {
  const normalizedName = `%${name}%`;

  return {
    programSpecialistName: {
      [Op.notILike]: normalizedName,
    },
  };
}
