import { filterAssociation } from './utils';

// this should return an array of activityReport ids.
// That where clause will be finished when the function is called.
export function userRoleReportsSql(roles) {
  return `
    SELECT
      "ActivityReports"."id"
    FROM "ActivityReports"
    WHERE "ActivityReports"."userId"`;
}

/*
 * 'SELECT "ActivityReportCollaborators"."activityReportId" FROM "Users"
 *  INNER JOIN "ActivityReportCollaborators"
 *  ON "ActivityReportCollaborators"."userId" = "Users"."id"
 *  WHERE "Users".name'
 */

export function withUserReportRoles(roles, options) {
  const { userId } = options;
  return filterAssociation(userRoleReportsSql(roles), [userId], false, '=');
}

export function withoutUserReportRoles(roles, options) {
  const { userId } = options;
  return filterAssociation(userRoleReportsSql(roles), [userId], true, '=');
}
