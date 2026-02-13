import { Op } from 'sequelize'
import { sequelize, Grant, Recipient } from '../models'

export async function statesByGrantRegion(regions) {
  const grants = await Grant.unscoped().findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('stateCode')), 'stateCode']],
    where: {
      stateCode: {
        [Op.not]: null,
      },
      regionId: regions,
    },
    raw: true,
    order: ['stateCode'],
  })

  return grants.map((grant) => grant.stateCode)
}

export async function grantById(grantId) {
  return Grant.findOne({
    attributes: ['id', 'cdi', 'number', 'status', 'startDate', 'endDate', 'regionId', 'recipientId'],
    include: [
      {
        model: Recipient,
        as: 'recipient',
      },
    ],
    where: {
      id: grantId,
    },
  })
}
