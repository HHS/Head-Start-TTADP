import { Op } from 'sequelize';
import { sequelize } from '../../models';

export function withStatus(status) {
  if (status.includes('Needs Status')) {
    return {
      [Op.or]: [
        {
          status: {
            [Op.or]: status.map((s) => ({
              [Op.iLike]: `%${s}%`, // sequelize escapes this
            })),
          },
        },
        {
          status: {
            [Op.eq]: null,
          },
        },
      ],
    };
  }

  return sequelize.where(
    sequelize.col('"Goal".status'),
    {
      status: {
        [Op.or]: status.map((s) => ({
          [Op.iLike]: `%${s}%`, // sequelize escapes this
        })),
      },
    },
  );
}

export function withoutStatus(status) {
  return {
    [Op.or]: [
      {
        status: {
          [Op.or]: status.map((s) => ({
            [Op.notILike]: `%${s}%`, // sequelize escapes this
          })),
        },
      },
      {
        status: {
          [Op.is]: null,
        },
      },
    ],
  };
}
