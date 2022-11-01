import { Op } from 'sequelize';
import { sequelize } from '../../models';
// TODO: fix
export function withCalculatedStatus(statuses) {
  return sequelize.where(
    sequelize.cast(sequelize.col('approval.calculatedStatus'), 'text'),
    {
      [Op.iRegexp]: statuses.join('|'),
    },
  );
}

export function withoutCalculatedStatus(statuses) {
  return sequelize.where(
    sequelize.cast(sequelize.col('approval.calculatedStatus'), 'text'),
    {
      [Op.notIRegexp]: statuses.join('|'),
    },
  );
}
