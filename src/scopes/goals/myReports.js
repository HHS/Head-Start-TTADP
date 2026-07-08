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

  let reportSql = '';
  if (isCreator) {
    reportSql += `
      SELECT DISTINCT "ActivityReportGoals"."goalId"
      FROM "ActivityReportGoals"
      INNER JOIN "ActivityReports"
      ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
      WHERE "ActivityReports"."userId" = '${userId}'
    `;
  }

  if (isCollaborator) {
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

  if (isApprover) {
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

  if (!reportSql) {
    // The filter is active but no Activity Report role was selected (e.g. the user
    // only selected Training Report roles on the TTA History tab). Avoid emitting an
    // invalid `IN ()`:
    // - "Where I'm the" (include): no goal matches this narrowed filter -> match nothing.
    // - "Where I'm not the" (exclude): every goal trivially satisfies "not one of these
    //   AR roles I never selected" -> match everything (no-op).
    if (roleList.length > 0) {
      return exclude ? {} : { [Op.or]: [sequelize.literal('1 = 0')] };
    }
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
