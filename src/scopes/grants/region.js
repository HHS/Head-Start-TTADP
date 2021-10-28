import { Op } from 'sequelize';

export default function withGrantsRegion(regions) {
  return {
    regionId: {
      [Op.in]: regions,
    },
  };
}
