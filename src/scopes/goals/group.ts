import { Op, type WhereOptions } from 'sequelize'
import { sequelize } from '../../models'
import { validatedIdArray } from '../utils'

// WARNING - DO NOT interpolate unvalidated input into this SQL literal.
// Only validated integers allowed.
const constructLiteral = (query: string[], userId: number): string => {
  const validatedIds = validatedIdArray(query)
  const placeholders = validatedIds.length > 0 ? validatedIds.join(',') : '-1'
  const escapedUserId = Number.isInteger(userId) ? userId : -1

  const sql = `
    (
      SELECT DISTINCT g."id"
      FROM "Goals" g
      JOIN "Grants" gr ON g."grantId" = gr.id
      JOIN "GroupGrants" gg ON gr.id = gg."grantId"
      JOIN "Groups" grp ON gg."groupId" = grp.id
      JOIN "GroupCollaborators" gc ON grp."id" = gc."groupId"
      WHERE grp."id" IN (${placeholders})
      AND (gc."userId" = ${escapedUserId} OR grp."isPublic" = true)
    )
  `

  return sequelize.literal(sql)
}

/**
 * @param {string[]} query
 * @param {number} userId
 * @returns {WhereOptions}
 * @see withoutGroup
 */
export function withGroup(query: string[], userId: number): WhereOptions {
  return {
    id: {
      [Op.in]: constructLiteral(query, userId),
    },
  }
}

/**
 * @param {string[]} query
 * @param {number} userId
 * @returns {WhereOptions}
 * @see withGroup
 */
export function withoutGroup(query: string[], userId: number): WhereOptions {
  return {
    id: {
      [Op.notIn]: constructLiteral(query, userId),
    },
  }
}
