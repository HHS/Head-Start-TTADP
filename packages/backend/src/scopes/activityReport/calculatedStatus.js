import { Op } from 'sequelize';
import { sequelize } from '../../models';

export function withCalculatedStatus(statuses) {
  return sequelize.where(
    sequelize.cast(sequelize.col('"ActivityReport".calculatedStatus'), 'text'),
    {
      [Op.iRegexp]: statuses.join('|'),
    },
  );
}

export function withoutCalculatedStatus(statuses) {
  return sequelize.where(
    sequelize.cast(sequelize.col('"ActivityReport".calculatedStatus'), 'text'),
    {
      [Op.notIRegexp]: statuses.join('|'),
    },
  );
}
