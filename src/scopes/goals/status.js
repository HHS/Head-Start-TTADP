import { Op } from 'sequelize';

export function withStatus(statuses) {
  if (statuses.includes('Needs status')) {
    return {
      [Op.or]: [
        ...statuses.map((s) => ({
          status: {
            [Op.iLike]: `%${s}%`, // sequelize escapes this
          },
        })),
        {
          status: {
            [Op.eq]: null,
          },
        },
      ],
    };
  }

  return {
    [Op.or]: statuses.map((s) => ({
      status: {
        [Op.iLike]: `%${s}%`, // sequelize escapes this
      },
    })),
  };
}

export function withoutStatus(statuses) {
  if (statuses.includes('Needs status')) {
    return {
      [Op.or]: [
        {
          [Op.and]: statuses.map((s) => ({
            status: {
              [Op.notILike]: `%${s}%`, // sequelize escapes this
            },
          })),
        },
        {
          status: {
            [Op.not]: null,
          },
        },
      ],
    };
  }

  return {
    [Op.or]: [
      {
        status: {
          [Op.eq]: null,
        },
      },
      {
        [Op.and]: statuses.map((s) => ({
          status: {
            [Op.notILike]: `%${s}%`, // sequelize escapes this
          },
        })),
      },
    ],
  };
}
