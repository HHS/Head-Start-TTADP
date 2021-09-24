import { Op } from 'sequelize';
import { sequelize } from '../../models';

export default function withGranteeRegion(regions) {
  return sequelize.where(
    sequelize.col('grants.regionId'),
    {
      [Op.in]: regions,
    },
  );
}
