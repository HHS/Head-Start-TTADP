import { Op } from 'sequelize';

export function withRegion(regions) {
  return {
    regionId: {
      [Op.in]: regions,
    },
  };
}

export function withoutRegion(regions) {
  return {
    regionId: {
      [Op.in]: regions,
    },
  };
}
