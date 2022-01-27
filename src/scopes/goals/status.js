import { Op } from 'sequelize';
import { sequelize } from '../../models';

export function withStatus(status) {
  return sequelize.where(
    sequelize.col('"Goal".status'),
    {
      [Op.in]: status,
    },
  );
}

export function withoutStatus(status) {
  return {
    [Op.or]: [
      {
        status: {
          [Op.not]: status,
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
