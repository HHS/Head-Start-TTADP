import { Op } from 'sequelize'

export function withRegion(regions: number[]) {
  return {
    regionId: {
      [Op.in]: regions,
    },
  }
}

export function withoutRegion(regions: number[]) {
  return {
    regionId: {
      [Op.notIn]: regions,
    },
  }
}
