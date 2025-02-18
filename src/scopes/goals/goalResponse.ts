import { filterAssociation } from './utils';

const sql = `
  WITH unnested_responses AS (
    SELECT "goalId", unnest("response") AS res
    FROM "GoalFieldResponses"
  )
  SELECT DISTINCT "Goals"."id"
  FROM "Goals" "Goals"
  INNER JOIN unnested_responses arr
    ON arr."goalId" = "Goals"."id"
  WHERE arr."res"`;

export function withGoalResponse(searchText: string[]) {
  return filterAssociation(sql, searchText, false);
}

export function withoutGoalResponse(searchText: string[]) {
  return filterAssociation(sql, searchText, true);
}
