import { Op } from 'sequelize';
import { sequelize } from '../../models';
// this should return an array of activityReport ids.
// That where clause will be finished when the function is called.
export function userRoleReportsScopes(userId, roles, exclude) {
  let reportSql = '';
  if (roles.includes('Creator')) {
    reportSql += `
    SELECT
      "ActivityReports"."id"
    FROM "ActivityReports"
    WHERE "ActivityReports"."userId" = '${userId}'`;
  }

  if (roles.includes('Collaborator')) {
    reportSql += `
    ${reportSql ? ' UNION ' : ''}
    SELECT
      DISTINCT "ActivityReportCollaborators"."activityReportId"
    FROM "ActivityReportCollaborators"
    WHERE "ActivityReportCollaborators"."userId" = '${userId}'`;
  }

  if (roles.includes('Approver')) {
    reportSql += `
    ${reportSql ? ' UNION ' : ''}
    SELECT
      DISTINCT "ActivityReportApprovers"."activityReportId"
    FROM "ActivityReportApprovers"
    WHERE "ActivityReportApprovers"."userId" = '${userId}'`;
  }

  reportSql = `"ActivityReport"."id" ${exclude ? ' NOT ' : ''} IN (${reportSql})`;

  return {
    [Op.or]: [
      sequelize.literal(reportSql),
    ],
  };
}

export function withUserReportRoles(roles, options) {
  const { userId } = options;
  return userRoleReportsScopes(userId, roles, false);
}

export function withoutUserReportRoles(roles, options) {
  const { userId } = options;
  return userRoleReportsScopes(userId, roles, true);
}
