import { Op } from 'sequelize'

export function withId(regions: number[]) {
  return {
    id: {
      [Op.in]: regions,
    },
  }
}

export function withoutId(regions: number[]) {
  return {
    id: {
      [Op.notIn]: regions,
    },
  }
}
