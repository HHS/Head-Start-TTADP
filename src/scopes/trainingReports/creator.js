/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize'
import { sequelize } from '../../models'

export function withCreators(userIds) {
  const userIdsAsNumbers = userIds.filter((id) => !Number.isNaN(id)).map((id) => Number(id))

  return sequelize.where(sequelize.col('"EventReportPilot".ownerId'), {
    [Op.in]: userIdsAsNumbers,
  })
}
