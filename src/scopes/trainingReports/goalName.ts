import { Op } from 'sequelize'

export function withGoalName(searchText: string[]) {
  const search = `%${searchText}%`

  return {
    [Op.and]: {
      'data.goal': {
        [Op.iLike]: search,
      },
    },
  }
}

export function withoutGoalName(searchText: string[]) {
  const search = `%${searchText}%`

  return {
    [Op.and]: {
      'data.goal': {
        [Op.notILike]: search,
      },
    },
  }
}
