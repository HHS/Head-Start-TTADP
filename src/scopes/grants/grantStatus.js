import { Op } from 'sequelize'
import { sequelize } from '../../models'

const grantStatusSql = (grantStatus, notWithin) => {
  let where = null
  if (grantStatus === 'active') {
    where = `"Grants"."status" = '${notWithin ? 'Inactive' : 'Active'}' AND "Grants"."cdi" = false`
  } else if (grantStatus === 'inactive') {
    where = `"Grants"."status" = '${notWithin ? 'Active' : 'Inactive'}' AND "Grants"."cdi" = false`
  } else {
    where = `"Grants"."cdi" = ${notWithin ? 'false' : 'true  AND "Grants"."status" = \'Active\''}`
  }
  return `
    SELECT
    DISTINCT "Grants"."id"
    FROM "Grants" "Grants"
    WHERE ${where}`
}

export function withGrantStatus(cdiStatus) {
  return {
    where: {
      id: {
        [Op.in]: sequelize.literal(`(
          ${grantStatusSql(cdiStatus[0], false)}
        )`),
      },
    },
  }
}

export function withoutGrantStatus(cdiStatus) {
  return {
    where: {
      id: {
        [Op.in]: sequelize.literal(`(
            ${grantStatusSql(cdiStatus[0], true)}
          )`),
      },
    },
  }
}
