import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';

export function withGroup(query: string[], userId: number): WhereOptions {
  const sanitizedName = sequelize.escape(query.join(''));
  return {
    id: {
      [Op.in]: sequelize.literal(`(SELECT "grantId" FROM "GrantGroups" WHERE "groupId" IN (SELECT "groupId" FROM "UserGroups" WHERE "name" = '${sanitizedName}' AND userId" = ${userId}))`),
    },
  };
}

export function withoutGroup(query: string[], userId: number): WhereOptions {
  return {
    id: {
      [Op.notIn]: sequelize.literal(`(SELECT "grantId" FROM "GrantGroups" WHERE "groupId" IN (SELECT "groupId" FROM "UserGroups" WHERE "name" = '${query.join('')}' AND userId" = ${userId}))`),
    },
  };
}
