import { Op } from 'sequelize'
import { filterAssociation } from './utils'
import { sequelize } from '../../models'

export function getSpecialistNameSql(role, name) {
  let reportSql = ''
  if (role === 'Collaborator' || role === 'Both') {
    reportSql += `
      SELECT
      DISTINCT
        "ActivityReportCollaborators"."activityReportId"
      FROM "Users" "Users"
      INNER JOIN "ActivityReportCollaborators" "ActivityReportCollaborators"
      ON "ActivityReportCollaborators"."userId" = "Users"."id"
      WHERE "Users"."name" ILIKE '%${name[0]}%'`
  }

  if (role === 'Both') {
    reportSql += ' UNION '
  }

  if (role === 'Creator' || role === 'Both') {
    reportSql += `
        SELECT
        DISTINCT
          "ActivityReports"."id"
        FROM "Users" "Users"
        INNER JOIN "ActivityReports" "ActivityReports"
        ON "ActivityReports"."userId" = "Users"."id"
        WHERE "Users"."name" ILIKE '%${name[0]}%'`
  }

  reportSql = `"ActivityReport"."id" IN (${reportSql})`

  return {
    [Op.or]: [sequelize.literal(reportSql)],
  }
}

export function onlyCollaborators(name) {
  return getSpecialistNameSql('Collaborator', name)
}

export function onlyCreators(name) {
  return getSpecialistNameSql('Creator', name)
}

export function bothCollaboratorsAndCreators(name) {
  return getSpecialistNameSql('Both', name)
}
