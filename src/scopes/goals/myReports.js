import { Op } from 'sequelize';
import { sequelize } from '../../models';

export function myReportsScopes(userId, roles, exclude) {
  const roleList = roles || [];
  // The RTR TTA History tab prefixes its Activity Report roles with "AR" (to
  // disambiguate them from the Training Report roles that share the filter),
  // while the Landing and Regional Dashboard filters use the original labels.
  // Accept both so a single backend contract serves every "My reports" filter.
  const isCreator = roleList.includes('Creator') || roleList.includes('AR creator');
  const isCollaborator = roleList.includes('Collaborator') || roleList.includes('AR collaborator');
  const isApprover = roleList.includes('Approver') || roleList.includes('AR approver');

  // Independently validate the user id as an integer before interpolating it into
  // the SQL expression below (per AGENTS.md "SQL injection in filters" guidance).
  const uid = Number(userId);
  const validUserId = Number.isInteger(uid) ? uid : null;

  let reportSql = '';
  if (validUserId !== null && isCreator) {
    reportSql += `
      SELECT DISTINCT "ActivityReportGoals"."goalId"
      FROM "ActivityReportGoals"
      INNER JOIN "ActivityReports"
      ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
      WHERE "ActivityReports"."userId" = ${uid}
    `;
  }

  if (validUserId !== null && isCollaborator) {
    reportSql += `
    ${reportSql ? ' UNION ' : ''}
      SELECT DISTINCT "ActivityReportGoals"."goalId"
      FROM "ActivityReportGoals"
      INNER JOIN "ActivityReports"
      ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
      INNER JOIN "ActivityReportCollaborators"
      ON "ActivityReportCollaborators"."activityReportId" = "ActivityReports"."id"
      WHERE "ActivityReportCollaborators"."userId" = ${uid}
    `;
  }

  if (validUserId !== null && isApprover) {
    reportSql += `
    ${reportSql ? ' UNION ' : ''}
      SELECT DISTINCT "ActivityReportGoals"."goalId"
      FROM "ActivityReportGoals"
      INNER JOIN "ActivityReports"
      ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
      INNER JOIN "ActivityReportApprovers"
      ON "ActivityReports"."id" = "ActivityReportApprovers"."activityReportId"
      WHERE "ActivityReportApprovers"."userId" = ${uid}
    `;
  }

  if (!reportSql) {
    // No matching Activity Report role was selected, so there's nothing to filter on.
    // Return a no-op scope, matching the convention used by the other filter scopes
    // (e.g. activityReport/role). Unlike the activityReport scope, the goals myReports
    // scope is never invoked with Training Report roles (it isn't used on the TTA
    // History tab), so no match-nothing special case is needed here.
    return {};
  }

  reportSql = `"Goal"."id" ${exclude ? ' NOT ' : ''} IN (${reportSql})`;

  return {
    [Op.or]: [sequelize.literal(reportSql)],
  };
}

export function withMyReports(roles, _options, userId) {
  return myReportsScopes(userId, roles, false);
}

export function withoutMyReports(roles, _options, userId) {
  return myReportsScopes(userId, roles, true);
}
