import { Op } from 'sequelize';

export function withRegion(regions) {
  return {
    region_id: {
      [Op.in]: regions,
    },
  };
}

export function withoutRegion(regions) {
  return {
    region_id: {
      [Op.notIn]: regions,
    },
  };
}
