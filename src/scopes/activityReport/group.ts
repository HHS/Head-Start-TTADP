import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';
import { idClause } from '../utils';

/**
 *
 * @param {string[]} query
 * @param {number} userId
 * @returns {WhereOptions}
 * @see withoutGroup
 */
export function withGroup(query: string[], userId: number): WhereOptions {
  const where = idClause(query);
  return {
    id: {
      [Op.in]: sequelize.literal(`(
        SELECT "activityReportId" FROM "ActivityRecipients" WHERE "grantId" IN (
            SELECT "grantId" FROM "GroupGrants" WHERE "groupId" IN (SELECT "id" FROM "Groups" WHERE "id" IN (${where}) AND "userId" = ${userId})
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
  const where = idClause(query);
  return {
    id: {
      [Op.notIn]: sequelize.literal(`(
        SELECT "activityReportId" FROM "ActivityRecipients" WHERE "grantId" IN (
            SELECT "grantId" FROM "GroupGrants" WHERE "groupId" IN (SELECT "id" FROM "Groups" WHERE "id" IN (${where}) AND "userId" = ${userId})
        )
      )`),
    },
  };
}
