import { Op } from 'sequelize'
import { sequelize } from '../../models'
import { auditLogger } from '../../logger'
// this should return an array of activityReport ids.
// That where clause will be finished when the function is called.
export function myReportsScopes(userId, roles, exclude) {
  const roleList = roles || []
  let reportSql = ''
  if (roleList.includes('Creator')) {
    reportSql += `
    SELECT
      "ActivityReports"."id"
    FROM "ActivityReports"
    WHERE "ActivityReports"."userId" = '${userId}'`
  }

  if (roleList.includes('Collaborator')) {
    reportSql += `
    ${reportSql ? ' UNION ' : ''}
    SELECT
      DISTINCT "ActivityReportCollaborators"."activityReportId"
    FROM "ActivityReportCollaborators"
    WHERE "ActivityReportCollaborators"."userId" = '${userId}'`
  }

  if (roleList.includes('Approver')) {
    reportSql += `
    ${reportSql ? ' UNION ' : ''}
    SELECT
      DISTINCT "ActivityReportApprovers"."activityReportId"
    FROM "ActivityReportApprovers"
    WHERE "ActivityReportApprovers"."userId" = '${userId}'`
  }

  if (!reportSql) {
    auditLogger.info(`User: ${userId} attempting to filter reports with a role: ${roles} `)
    return {}
  }

  reportSql = `"ActivityReport"."id" ${exclude ? ' NOT ' : ''} IN (${reportSql})`

  return {
    [Op.or]: [sequelize.literal(reportSql)],
  }
}

export function withMyReports(roles, _options, userId) {
  return myReportsScopes(userId, roles, false)
}

export function withoutMyReports(roles, _options, userId) {
  return myReportsScopes(userId, roles, true)
}
