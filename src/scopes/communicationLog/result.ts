import { Op } from 'sequelize'

export function withResult(results: string[]) {
  return {
    data: {
      result: {
        [Op.in]: results,
      },
    },
  }
}

export function withoutResult(results: string[]) {
  return {
    data: {
      result: {
        [Op.notIn]: results,
      },
    },
  }
}
