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
  const nameClause = query
    .map((name) => sequelize.escape(name)).join(',');
  return {
    id: {
      [Op.in]: sequelize.literal(`(
        SELECT "activityReportId" FROM "ActivityRecipients" WHERE "grantId" IN (
            SELECT "grantId" FROM "GroupGrants" WHERE "groupId" IN (SELECT "id" FROM "Groups" WHERE "name" IN (${nameClause}) AND "userId" = ${userId})
        )
      )`),
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
    .map((name) => sequelize.escape(name)).join(',');
  return {
    id: {
      [Op.notIn]: sequelize.literal(`(
        SELECT "activityReportId" FROM "ActivityRecipients" WHERE "grantId" IN (
            SELECT "grantId" FROM "GroupGrants" WHERE "groupId" IN (SELECT "id" FROM "Groups" WHERE "name" IN (${nameClause}) AND "userId" = ${userId})
        )
      )`),
    },
  };
}
