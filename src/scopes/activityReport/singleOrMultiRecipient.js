import { Op } from 'sequelize'
import { sequelize } from '../../models'

const recipientSql = (singleOrMulti) => `SELECT
  "ActivityRecipients"."activityReportId"
  FROM "Recipients" "Recipients"
  INNER JOIN "Grants" "Grants"
  ON "Grants"."recipientId" = "Recipients"."id"
  INNER JOIN "ActivityRecipients" "ActivityRecipients"
    ON "ActivityRecipients"."grantId" = "Grants"."id"
  GROUP BY "ActivityRecipients"."activityReportId"
  HAVING
    COUNT(DISTINCT COALESCE(NULLIF("Recipients"."uei",''),"Recipients"."name"))
    ${singleOrMulti === 'single-recipient' ? '=' : '>'} 1`

// eslint-disable-next-line import/prefer-default-export
export function withSingleOrMultiRecipients(singleOrMulti) {
  return {
    id: {
      [Op.in]: sequelize.literal(`(
        ${recipientSql(singleOrMulti[0])}
      )`),
    },
  }
}
