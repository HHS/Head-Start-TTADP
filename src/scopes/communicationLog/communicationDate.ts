import { Op } from 'sequelize'
import db from '../../models'

const { sequelize } = db

export function beforeCommunicationDate(dates: string[]) {
  return {
    [Op.and]: [
      sequelize.literal(`
        ("CommunicationLog"."data"#>>'{communicationDate}') IS NOT NULL
        AND ("CommunicationLog"."data"#>>'{communicationDate}') <> ''
        AND ("CommunicationLog"."data"#>>'{communicationDate}')::timestamp with time zone <= ${sequelize.escape(dates[0])}::timestamp with time zone
      `),
    ],
  }
}

export function afterCommunicationDate(dates: string[]) {
  return {
    [Op.and]: [
      sequelize.literal(`
        ("CommunicationLog"."data"#>>'{communicationDate}') IS NOT NULL
        AND ("CommunicationLog"."data"#>>'{communicationDate}') <> ''
        AND ("CommunicationLog"."data"#>>'{communicationDate}')::timestamp with time zone >= ${sequelize.escape(dates[0])}::timestamp with time zone
      `),
    ],
  }
}

export function withinCommunicationDate(dates: string[]) {
  const splitDates = dates[0].split('-')
  if (splitDates.length !== 2) {
    return {}
  }
  const startDate = splitDates[0]
  const endDate = splitDates[1]

  return {
    [Op.and]: [
      sequelize.literal(`
        ("CommunicationLog"."data"#>>'{communicationDate}') IS NOT NULL
        AND ("CommunicationLog"."data"#>>'{communicationDate}') <> ''
        AND ("CommunicationLog"."data"#>>'{communicationDate}')::timestamp with time zone
        BETWEEN ${sequelize.escape(startDate)}::timestamp with time zone
        AND ${sequelize.escape(endDate)}::timestamp with time zone
      `),
    ],
  }
}
