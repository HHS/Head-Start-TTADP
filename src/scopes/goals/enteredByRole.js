import { Op } from 'sequelize'
import { sequelize } from '../../models'

const enteredByRole = (roles, options) => {
  const roleConditions = `r."name" <> '' AND r."name" IN (${roles.map((r) => sequelize.escape(r)).join(',')})`

  return `(
          SELECT DISTINCT "Goal".id FROM "Goals" "Goal"
            INNER JOIN "ActivityReportGoals" "arg" ON "Goal".id = arg."goalId"
            INNER JOIN "ActivityReports" "ar" ON arg."activityReportId" = ar.id
            INNER JOIN "Users" "u" ON ar."userId" = u.id
            INNER JOIN "UserRoles" "ur" ON u.id = ur."userId"
            INNER JOIN "Roles" "r" ON ur."roleId" = r.id
            WHERE ${roleConditions}
        )`
}

export function withEnteredByRole(roles, options) {
  return {
    id: {
      [Op.in]: sequelize.literal(enteredByRole(roles, options)),
    },
  }
}

export function withoutEnteredByRole(roles, options) {
  return {
    id: {
      [Op.notIn]: sequelize.literal(enteredByRole(roles, options)),
    },
  }
}
