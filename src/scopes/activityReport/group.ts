import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';
import { idClause } from '../utils';

const constructLiteral = (query: string[], userId: number): string => {
  const where = idClause(query);
  return sequelize.literal(`(
    SELECT "activityReportId" FROM "ActivityRecipients" WHERE "grantId" IN (
      SELECT "grantId" FROM "GroupGrants" WHERE "groupId" IN (
        SELECT "id" FROM "Groups" WHERE "id" IN (${where}) AND "userId" = ${userId} OR "isPublic" = true)
    )
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
