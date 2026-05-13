import { Op } from 'sequelize';

export function withRegion(regions) {
  return {
    where: {
      region_id: {
        [Op.in]: regions,
      },
    },
  };
}

export function withoutRegion(regions) {
  return {
    where: {
      region_id: {
        [Op.notIn]: regions,
      },
    },
  };
}
