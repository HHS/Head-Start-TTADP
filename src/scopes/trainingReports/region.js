import { Op } from 'sequelize'
import { sequelize } from '../../models'

export function withRegion(regions) {
  return sequelize.where(sequelize.col('"EventReportPilot".regionId'), {
    [Op.in]: regions,
  })
}

export function withoutRegion(regions) {
  return sequelize.where(sequelize.col('"EventReportPilot".regionId'), {
    [Op.notIn]: regions,
  })
}
