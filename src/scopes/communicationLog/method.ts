import { Op } from 'sequelize'

export function withMethod(methods: string[]) {
  return {
    data: {
      method: {
        [Op.in]: methods,
      },
    },
  }
}

export function withoutMethod(methods: string[]) {
  return {
    data: {
      method: {
        [Op.notIn]: methods,
      },
    },
  }
}
