import { Op } from 'sequelize';
import { sequelize } from '../../models';

export function withStatus(statuses) {
  return sequelize.where(
    sequelize.cast(sequelize.col('"ActivityReport".status'), 'text'),
    {
      [Op.iRegexp]: statuses.join('|'),
    },
  );
}

export function withoutStatus(statuses) {
  return sequelize.where(
    sequelize.cast(sequelize.col('"ActivityReport".status'), 'text'),
    {
      [Op.notIRegexp]: statuses.join('|'),
    },
  );
}
