import { filterAssociation } from './utils';

const feiResponseSql = `
WITH unnested_responses AS (
    SELECT "activityReportGoalId", unnest("response") AS res
    FROM "ActivityReportGoalFieldResponses"
)
SELECT
  DISTINCT "ActivityReportGoals"."activityReportId"
FROM "ActivityReportGoals" "ActivityReportGoals"
INNER JOIN unnested_responses arr
    ON arr."activityReportGoalId" = "ActivityReportGoals"."id"
WHERE arr."res"`;

export function withFeiRootCause(responses) {
  return filterAssociation(feiResponseSql, responses, false);
}

export function withoutFeiRootCause(responses) {
  return filterAssociation(feiResponseSql, responses, true);
}
