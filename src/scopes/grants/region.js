import { Op } from 'sequelize';
import { sequelize } from '../../models';

export default function withGrantsRegion(regions) {
  return sequelize.where(
    sequelize.col('"Grant".regionId'),
    {
      [Op.in]: regions,
    },
  );
}
