import { Op } from 'sequelize';
import { sequelize } from '../../models';
// this should return an array of activityReport ids.
// That where clause will be finished when the function is called.
export function myReportsScopes(userId, roles, exclude) {
  let reportSql = '';
  if (roles.includes('Creator')) {
    reportSql += `
      SELECT DISTINCT "ActivityReportGoals"."goalId"
      FROM "ActivityReportGoals"
      INNER JOIN "ActivityReports"
      ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
      WHERE "ActivityReports"."userId" = '${userId}'
    `;
  }

  if (roles.includes('Collaborator')) {
    reportSql += `
    ${reportSql ? ' UNION ' : ''}
      SELECT DISTINCT "ActivityReportGoals"."goalId"
      FROM "ActivityReportGoals"
      INNER JOIN "ActivityReports"
      ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
      INNER JOIN "ActivityReportCollaborators"
      ON "ActivityReportCollaborators"."activityReportId" = "ActivityReports"."id"
      WHERE "ActivityReportCollaborators"."userId" = '${userId}'
    `;
  }

  if (roles.includes('Approver')) {
    reportSql += `
    ${reportSql ? ' UNION ' : ''}
      SELECT DISTINCT "ActivityReportGoals"."goalId"
      FROM "ActivityReportGoals"
      INNER JOIN "ActivityReports"
      ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
      INNER JOIN "ActivityReportApprovers"
      ON "ActivityReports"."id" = "ActivityReportApprovers"."activityReportId"
      WHERE "ActivityReportApprovers"."userId" = '${userId}'
    `;
  }

  reportSql = `"Goal"."id" ${exclude ? ' NOT ' : ''} IN (${reportSql})`;

  return {
    [Op.or]: [
      sequelize.literal(reportSql),
    ],
  };
}

export function withMyReports(roles, _options, userId) {
  console.log("query", roles, "_options", _options, "userId", userId)
  return myReportsScopes(userId, roles, false);
}

export function withoutMyReports(roles, _options, userId) {
  return myReportsScopes(userId, roles, true);
}
