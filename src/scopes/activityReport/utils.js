import { Op } from 'sequelize'
import { sequelize } from '../../models'
import { filterAssociation as filter } from '../utils'

function expandArray(column, searchTerms, operator) {
  return searchTerms.map((term) => sequelize.literal(`${column} ${operator} ${sequelize.escape(`%${String(term).trim()}%`)}`))
}

function reportInSubQuery(baseQuery, searchTerms, operator, comparator) {
  return searchTerms.map((term) =>
    sequelize.literal(`"ActivityReport"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(String(term).trim())})`)
  )
}

export default function filterArray(column, searchTerms, exclude, includeOperator = Op.or, excludeOperator = Op.and, arrayExpansion = expandArray) {
  if (exclude) {
    return {
      [Op.or]: [
        {
          [excludeOperator]: arrayExpansion(column, searchTerms, 'NOT ILIKE'),
        },
        sequelize.literal(`${column} IS NULL`),
      ],
    }
  }
  return {
    [includeOperator]: arrayExpansion(column, searchTerms, 'ILIKE'),
  }
}

function normalizeExactArrayTerms(searchTerms) {
  return searchTerms.map((term) => (term === null || term === undefined ? '' : String(term).trim())).filter((term) => term.length > 0)
}

export function filterExactArray(column, searchTerms, exclude, includeOperator = Op.or, excludeOperator = Op.and, arrayType = 'varchar[]') {
  if (!searchTerms || searchTerms.length === 0) {
    return {}
  }

  const normalizedTerms = normalizeExactArrayTerms(searchTerms)
  if (!normalizedTerms.length) {
    return {}
  }

  const matches = normalizedTerms.map((term) => `${column} @> ARRAY[${sequelize.escape(term)}]::${arrayType}`)

  if (exclude) {
    return {
      [Op.or]: [
        {
          [excludeOperator]: matches.map((clause) => sequelize.literal(`NOT (${clause})`)),
        },
        sequelize.literal(`${column} IS NULL`),
      ],
    }
  }

  return {
    [includeOperator]: matches.map((clause) => sequelize.literal(clause)),
  }
}

/**
 *
 *  baseQuery should be a SQL statement up to and including the end of a final where
 *  for example
 *
 * 'SELECT "ActivityReportCollaborators"."activityReportId" FROM "Users"
 *  INNER JOIN "ActivityReportCollaborators"
 *  ON "ActivityReportCollaborators"."userId" = "Users"."id"
 *  WHERE "Users".name'
 *
 * Assuming this is to get all matching reports, when this is passed to
 * reportInSubQuery, it will be transformed and executed as
 *
 * "ActivityReport"."id" IN (
 *    'SELECT "ActivityReportCollaborators"."activityReportId" FROM "Users"
 *     INNER JOIN "ActivityReportCollaborators"
 *     ON "ActivityReportCollaborators"."userId" = "Users"."id"
 *     WHERE "Users".name' ~* "Name")`
 * Where that final name is one of the members of the searchTerms array
 *
 * @param {*} baseQuery a partial sql statement
 * @param {*} searchTerms an array of search terms from the query string
 * @param {*} exclude whether this should exclude or include reports
 * @param {*} comparator default ~*
 * what is used to compare the end of the baseQuery to the searchTerm
 * @returns an object in the style of a sequelize where clause
 */

export function filterAssociation(baseQuery, searchTerms, exclude, comparator = '~*') {
  return filter(baseQuery, searchTerms, exclude, reportInSubQuery, comparator)
}

const selectDistinctActivityReports = (join, having) => `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  ${join}
  GROUP BY "ActivityReports"."id"
  HAVING ${having}`

export const nextStepsIncludeExclude = (include = true) => {
  const a = include ? '' : 'bool_or("NextSteps".note IS NULL) OR'

  return selectDistinctActivityReports(
    'LEFT JOIN "NextSteps" ON "NextSteps"."activityReportId" = "ActivityReports"."id"',
    `${a} LOWER(STRING_AGG("NextSteps".note, CHR(10)))`
  )
}

export const argsIncludeExclude = (include = true) => {
  const a = include ? '' : 'bool_or("ActivityReportGoals".name IS NULL) OR'

  return selectDistinctActivityReports(
    'LEFT JOIN "ActivityReportGoals" ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"',
    `${a} LOWER(STRING_AGG("ActivityReportGoals".name, CHR(10)))`
  )
}

export const objectiveTitleAndTtaProvidedIncludeExclude = (include = true) => {
  const a = include ? '' : 'bool_or("ActivityReportObjectives".title IS NULL OR "ActivityReportObjectives"."ttaProvided" IS NULL) OR'

  return selectDistinctActivityReports(
    'LEFT JOIN "ActivityReportObjectives" ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"',
    `${a} LOWER(STRING_AGG(concat_ws(CHR(10), "ActivityReportObjectives".title, "ActivityReportObjectives"."ttaProvided"), CHR(10)))`
  )
}

export const activityReportContextandAdditionalNotesIncludeExclude = (include = true) => {
  const a = include ? '' : 'bool_or("ActivityReports"."context" IS NULL) OR'

  return selectDistinctActivityReports(
    '',
    `${a} LOWER(STRING_AGG(concat_ws(CHR(10), "ActivityReports"."context", "ActivityReports"."additionalNotes"), CHR(10)))`
  )
}
