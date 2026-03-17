import { Op } from 'sequelize';
import { sequelize } from '../../models';

type RoleFilter = string | string[] | null | undefined;

const ACCEPTABLE_ROLES = [
  'Early Childhood Specialist',
  'Family Engagement Specialist',
  'Grantee Specialist',
  'Health Specialist',
  'System Specialist',
];

function roleQuery(escapedRoles: string): string {
  return `
  SELECT
    "CommunicationLogs"."id"
  FROM "Users" u
  INNER JOIN "CommunicationLogs" cl
  ON cl."userId" = u."id"
  INNER JOIN "UserRoles" ur
  ON ur."userId" = u."id"
  INNER JOIN "Roles" r
  ON r."id" = ur."roleId"
  WHERE r."fullName" IN (${escapedRoles})`;
}

function generateWhere(escapedRoles: string[], exclude: boolean) {
  const roleSubQuery = roleQuery(escapedRoles.join(','));

  if (exclude) {
    return {
      id: {
        [Op.notIn]: sequelize.literal(`(${roleSubQuery})`),
      },
    };
  }

  return {
    id: {
      [Op.in]: sequelize.literal(`(${roleSubQuery})`),
    },
  };
}

const normalizeAndEscapeRoles = (roles: RoleFilter): string[] => {
  if (!roles) {
    return [];
  }

  const roleList = Array.isArray(roles) ? roles : roles.split(',');

  return roleList
    .map((role) => role?.trim())
    .filter((role): role is string => Boolean(role) && ACCEPTABLE_ROLES.includes(role))
    .map((role) => sequelize.escape(role));
};

export function withRoles(rolesFromQuery: RoleFilter) {
  const acceptableRoles = normalizeAndEscapeRoles(rolesFromQuery);

  if (!acceptableRoles.length) {
    return {};
  }

  return generateWhere(acceptableRoles, false);
}

export function withoutRoles(rolesFromQuery: RoleFilter) {
  const acceptableRoles = normalizeAndEscapeRoles(rolesFromQuery);

  if (!acceptableRoles.length) {
    return {};
  }

  return generateWhere(acceptableRoles, true);
}
