import { Op } from 'sequelize'

export function withIds(ids: string[]) {
  return {
    id: {
      [Op.in]: ids.map((id) => Number(id)),
    },
  }
}

export function withoutIds(ids: string[]) {
  return {
    id: {
      [Op.notIn]: ids.map((id) => Number(id)),
    },
  }
}
