import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';

/**
 *
 * @param {string[]} query
 * @param {number} userId
 * @returns {WhereOptions}
 * @see withoutGroup
 */
export function withGroup(query: string[], userId: number): WhereOptions {
  /**
   * this looks a little funky but they come from the frontend query string like so:
   * ?group=group1,group2,group3, and so they are passed through as ['group1,group2,group3']
   */
  const nameClause = query
    .map((q) => q.split(','))
    .flat()
    .map((name) => sequelize.escape(name)).join(',');
  return {
    id: {
      [Op.in]: sequelize.literal(`(SELECT "grantId" FROM "GroupGrants" WHERE "groupId" IN (SELECT "id" FROM "Groups" WHERE "name" IN (${nameClause}) AND "userId" = ${userId}))`),
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
  const nameClause = query
    .map((q) => q.split(','))
    .flat()
    .map((name) => sequelize.escape(name)).join(',');
  return {
    id: {
      [Op.notIn]: sequelize.literal(`(SELECT "grantId" FROM "GroupGrants" WHERE "groupId" IN (SELECT "id" FROM "Groups" WHERE "name" in (${nameClause}) AND "userId" = ${userId}))`),
    },
  };
}
