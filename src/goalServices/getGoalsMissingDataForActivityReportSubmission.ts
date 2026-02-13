import { Op } from 'sequelize'
import db from '../models'

const { sequelize, Goal, Grant, GoalFieldResponse, Recipient } = db

export default async function getGoalsMissingDataForActivityReportSubmission(goalIds: number[]) {
  return Goal.findAll({
    raw: true,
    attributes: [
      'id',
      [sequelize.col('grant."regionId"'), 'regionId'],
      [sequelize.col('grant."number"'), 'grantNumber'],
      [sequelize.col('grant.recipient.id'), 'recipientId'],
      [sequelize.col('grant.recipient.name'), 'recipientName'],
    ],
    where: {
      id: goalIds,
    },
    having: sequelize.literal('COUNT(responses.id) = 0'),
    group: ['Goal.id', 'grant.id', 'grant.recipient.id', 'grant.recipient.name', 'grant.regionId', 'grant.number'],
    include: [
      {
        model: GoalFieldResponse,
        as: 'responses',
        required: false,
        attributes: [],
        where: {
          response: {
            [Op.ne]: [],
          },
        },
      },
      {
        model: Grant,
        as: 'grant',
        attributes: [],
        required: true,
        include: [
          {
            model: Recipient,
            required: true,
            as: 'recipient',
            attributes: [],
          },
        ],
      },
    ],
  }) as Array<{
    id: number
    responses: Array<{
      response: string
      goalId: number
    }>
    grant: {
      regionId: number
      number: string
      recipient: {
        id: number
        name: string
      }
      id: number
    }
  }>
}
