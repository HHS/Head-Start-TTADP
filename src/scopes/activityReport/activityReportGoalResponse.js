import { filterAssociation } from './utils';

const activityReportGoalResponseSql = /* sql */`
WITH unnested_responses AS (
  SELECT unnest("response") AS res, ARRAY_AGG(DISTINCT "ActivityReportGoals"."activityReportId") ids
  FROM "ActivityReportGoalFieldResponses" "ActivityReportGoalFieldResponses"
  INNER JOIN "ActivityReportGoals" "ActivityReportGoals"
  ON "ActivityReportGoalFieldResponses"."activityReportGoalId" = "ActivityReportGoals"."id"
  GROUP BY 1
)
SELECT 
  UNNEST(ids) AS "activityReportId"
FROM unnested_responses
WHERE "res"`;

export function withActivityReportGoalResponse(responses) {
  return filterAssociation(activityReportGoalResponseSql, responses, false);
}

export function withoutActivityReportGoalResponse(responses) {
  return filterAssociation(activityReportGoalResponseSql, responses, true);
}
