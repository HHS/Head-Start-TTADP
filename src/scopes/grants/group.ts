import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';
import { validatedIdArray } from '../utils';

// WARNING - DO NOT interpolate unvalidated input into this SQL literal.
// Only validated integers allowed.
const constructLiteral = (query: string[], userId: number): string => {
  const validatedIds = validatedIdArray(query);
  const placeholders = validatedIds.length > 0 ? validatedIds.join(',') : '-1';
  const escapedUserId = Number.isInteger(userId) ? userId : -1;

  const sql = `
    (
      SELECT DISTINCT "grantId"
      FROM "GroupGrants" gg
      JOIN "Groups" g ON gg."groupId" = g."id"
      JOIN "GroupCollaborators" gc ON g."id" = gc."groupId"
      WHERE g."id" IN (${placeholders})
      AND (gc."userId" = ${escapedUserId} OR g."isPublic" = true)
    )
  `;
  return sequelize.literal(sql);
};

/**
 *
 * @param {string[]} query
 * @param {number} userId
 * @returns {WhereOptions}
 * @see withoutGroup
 */
export function withGroup(query: string[], userId: number): WhereOptions {
  return {
    where: {
      id: {
        [Op.in]: constructLiteral(query, userId),
      },
    },
  };
}

/**
 * @param {string[]} query
 * @param {number} userId
 * @returns {WhereOptions}
 * @see withGroup
 */
export function withoutGroup(query: string[], userId: number): WhereOptions {
  return {
    where: {
      id: {
        [Op.notIn]: constructLiteral(query, userId),
      },
    },
  };
}
