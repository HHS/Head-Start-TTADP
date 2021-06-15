import { Op } from 'sequelize';
import { sequelize } from '../../models';

export default function withRegion(regions) {
  return sequelize.where(
    sequelize.col('"ActivityReport".regionId'),
    {
      [Op.in]: regions,
    },
  );
}
