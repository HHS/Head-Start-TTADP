import { filterAssociation } from './utils';
import { auditLogger } from '../../logger';

const userQuery = `
  SELECT
    cl."id"
  FROM "Users" users
  INNER JOIN "CommunicationLogs" cl
  ON cl."userId" = users."id"
  INNER JOIN "UserRoles" ur
  ON ur."userId" = users."id"
  INNER JOIN "Roles" roles
  ON roles."id" = ur."roleId"
  WHERE roles."fullName"`;

type RoleFilter = string | string[] | null | undefined;

const normalizeRoles = (roles: RoleFilter): string[] => {
  if (!roles) {
    return [];
  }

  const roleList = Array.isArray(roles) ? roles : roles.split(',');

  return roleList
    .map((r) => r?.trim())
    .filter((r): r is string => Boolean(r));
};

export function withRoles(rolesFromQuery: RoleFilter) {
  auditLogger.info(`Normalizing roles for communication log filter: ${JSON.stringify(rolesFromQuery)}`);
  const roles = normalizeRoles(rolesFromQuery);

  if (!roles.length) {
    return {};
  }

  return filterAssociation(userQuery, roles, false);
}

export function withoutRoles(rolesFromQuery: RoleFilter) {
  const roles = normalizeRoles(rolesFromQuery);

  if (!roles.length) {
    return {};
  }

  return filterAssociation(userQuery, roles, true);
}
