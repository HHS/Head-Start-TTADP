import { filterAssociation } from './utils'

const activityReportGoalResponseSql = `
WITH unnested_responses AS (
    SELECT "activityReportGoalId", unnest("response") AS res
    FROM "ActivityReportGoalFieldResponses"
)
SELECT
  DISTINCT "ActivityReportGoals"."activityReportId"
FROM "ActivityReportGoals" "ActivityReportGoals"
INNER JOIN unnested_responses arr
    ON arr."activityReportGoalId" = "ActivityReportGoals"."id"
WHERE arr."res"`

export function withActivityReportGoalResponse(responses) {
  return filterAssociation(activityReportGoalResponseSql, responses, false)
}

export function withoutActivityReportGoalResponse(responses) {
  return filterAssociation(activityReportGoalResponseSql, responses, true)
}
