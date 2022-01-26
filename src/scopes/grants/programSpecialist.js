import sequelize, { Op } from 'sequelize';

export function withProgramSpecialist(name) {
  const normalizedName = `%${sequelize.escape(name)}%`;

  return {
    programSpecialistName: {
      [Op.iLike]: normalizedName,
    },
  };
}

export function withoutProgramSpecialist(name) {
  const normalizedName = `%${sequelize.escape(name)}%`;

  return {
    programSpecialistName: {
      [Op.notILike]: normalizedName,
    },
  };
}
