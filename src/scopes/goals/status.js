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
  return sequelize.where(
    sequelize.col('"Goal".status'),
    {
      [Op.notIn]: status,
    },
  );
}
