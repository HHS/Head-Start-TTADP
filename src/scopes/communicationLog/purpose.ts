import { Op } from 'sequelize'

export function withPurpose(purposes: string[]) {
  return {
    data: {
      purpose: {
        [Op.in]: purposes,
      },
    },
  }
}

export function withoutPurpose(purposes: string[]) {
  return {
    data: {
      purpose: {
        [Op.notIn]: purposes,
      },
    },
  }
}
