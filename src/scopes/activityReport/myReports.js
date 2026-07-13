import { Op } from 'sequelize';
import { auditLogger } from '../../logger';
import { sequelize } from '../../models';
// this should return an array of activityReport ids.
// That where clause will be finished when the function is called.
export function myReportsScopes(userId, roles, exclude) {
  const roleList = roles || [];
  // The RTR TTA History tab labels its Activity Report roles with an "AR" prefix
  // (to disambiguate them from the Training Report roles that share the filter),
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
    SELECT
      "ActivityReports"."id"
    FROM "ActivityReports"
    WHERE "ActivityReports"."userId" = ${uid}`;
  }

  if (validUserId !== null && isCollaborator) {
    reportSql += `
    ${reportSql ? ' UNION ' : ''}
    SELECT
      DISTINCT "ActivityReportCollaborators"."activityReportId"
    FROM "ActivityReportCollaborators"
    WHERE "ActivityReportCollaborators"."userId" = ${uid}`;
  }

  if (validUserId !== null && isApprover) {
    reportSql += `
    ${reportSql ? ' UNION ' : ''}
    SELECT
      DISTINCT "ActivityReportApprovers"."activityReportId"
    FROM "ActivityReportApprovers"
    WHERE "ActivityReportApprovers"."userId" = ${uid}`;
  }

  if (!reportSql) {
    // The filter is active but no Activity Report role was selected (e.g. the user
    // only selected Training Report roles on the TTA History tab).
    // - "Where I'm the" (include): no AR matches this narrowed filter -> match nothing.
    // - "Where I'm not the" (exclude): every AR trivially satisfies "not one of these
    //   AR roles I never selected" -> match everything (no-op).
    if (roleList.length > 0) {
      return exclude ? {} : { [Op.or]: [sequelize.literal('1 = 0')] };
    }
    auditLogger.info(`User: ${userId} attempting to filter reports with a role: ${roles} `);
    return {};
  }

  reportSql = `"ActivityReport"."id" ${exclude ? ' NOT ' : ''} IN (${reportSql})`;

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
