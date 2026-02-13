import { Op } from 'sequelize'
import { filterAssociation, selectDistinctActivityReportGoalIds } from './utils'

const nextStepsIncludeExclude = (include) => {
  const a = include ? '' : 'bool_or("NextSteps".note IS NULL) OR'

  return selectDistinctActivityReportGoalIds(
    `LEFT JOIN "ActivityReports" ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
     LEFT JOIN "NextSteps" ON "NextSteps"."activityReportId" = "ActivityReports"."id"`,
    `${a} LOWER(STRING_AGG("NextSteps".note, CHR(10)))`
  )
}

const argsIncludeExclude = (include) => {
  const a = include ? '' : 'bool_or("ActivityReportGoals".name IS NULL) OR'

  return selectDistinctActivityReportGoalIds('', `${a} LOWER(STRING_AGG("ActivityReportGoals".name, CHR(10)))`)
}

const objectiveTitleAndTtaProvidedIncludeExclude = (include) => {
  const a = include ? '' : 'bool_or("ActivityReportObjectives".title IS NULL OR "ActivityReportObjectives"."ttaProvided" IS NULL) OR'

  return selectDistinctActivityReportGoalIds(
    `LEFT JOIN "ActivityReports" ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
     LEFT JOIN "ActivityReportObjectives" ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"`,
    `${a} LOWER(STRING_AGG(concat_ws(CHR(10), "ActivityReportObjectives".title, "ActivityReportObjectives"."ttaProvided"), CHR(10)))`
  )
}

// eslint-disable-next-line max-len
const activityReportContextandAdditionalNotesIncludeExclude = () =>
  selectDistinctActivityReportGoalIds(
    'LEFT JOIN "ActivityReports" ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"',
    'LOWER(STRING_AGG(concat_ws(CHR(10), "ActivityReports"."context", "ActivityReports"."additionalNotes"), CHR(10)))'
  )

export function withReportText(searchText) {
  const search = [`%${searchText.map((st) => st.toLowerCase())}%`]

  return {
    [Op.or]: [
      filterAssociation(nextStepsIncludeExclude(true), search, false, 'LIKE'),
      filterAssociation(argsIncludeExclude(true), search, false, 'LIKE'),
      filterAssociation(objectiveTitleAndTtaProvidedIncludeExclude(true), search, false, 'LIKE'),
      filterAssociation(activityReportContextandAdditionalNotesIncludeExclude(true), search, false, 'LIKE'),
    ],
  }
}

export function withoutReportText(searchText) {
  const search = [`%${searchText.map((st) => st.toLowerCase())}%`]

  return {
    [Op.and]: [
      filterAssociation(nextStepsIncludeExclude(false), search, false, 'NOT LIKE'),
      filterAssociation(argsIncludeExclude(false), search, false, 'NOT LIKE'),
      filterAssociation(objectiveTitleAndTtaProvidedIncludeExclude(false), search, false, 'NOT LIKE'),
      filterAssociation(activityReportContextandAdditionalNotesIncludeExclude(false), search, false, 'NOT LIKE'),
    ],
  }
}
