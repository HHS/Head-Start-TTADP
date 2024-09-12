import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';
import { idClause } from '../utils';

const constructLiteral = (query: string[], userId: number): string => {
  const where = idClause(query);
  return sequelize.literal(`(
      SELECT DISTINCT "activityReportId"
      FROM "ActivityRecipients" ar
      JOIN "GroupGrants" gg
        ON ar."grantId" = gg."grantId"
      JOIN "Groups" g
        ON gg."groupId" = g.id
      JOIN "GroupCollaborators" gc
        ON g."id" = gc."groupId"
      WHERE g."id" IN (${where})
      AND (gc."userId" = ${userId} OR g."isPublic" = true)
  )`);
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
    id: {
      [Op.in]: constructLiteral(query, userId),
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
    id: {
      [Op.notIn]: constructLiteral(query, userId),
    },
  };
}
