import { Op } from 'sequelize';

export function withRegion(regions) {
  return {
    where: {
      regionId: {
        [Op.in]: regions,
      },
    },
  };
}

export function withoutRegion(regions) {
  return {
    where: {
      regionId: {
        [Op.in]: regions,
      },
    },
  };
}
