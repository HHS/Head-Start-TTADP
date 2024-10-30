import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';

function getSql(responses: string[]) {
  return sequelize.literal(`(
    WITH unnested_responses AS (
      SELECT "goalId", unnest("response") AS res
      FROM "GoalFieldResponses"
    )
    SELECT DISTINCT "Grants"."id"
    FROM "Goals" "Goals"
    INNER JOIN unnested_responses arr
      ON arr."goalId" = "Goals"."id"
    INNER JOIN "Grants" "Grants"
      ON "Grants"."id" = "Goals"."grantId"
    WHERE arr."res" IN (${responses.map((s) => `'${s}'`).join(', ')})
  )`);
}

export function withGoalResponse(searchText: string[]): WhereOptions {
  return {
    where: {
      id: {
        [Op.in]: getSql(searchText),
      },
    },
  };
}

export function withoutGoalResponse(searchText: string[]) {
  return {
    where: {
      id: {
        [Op.notIn]: getSql(searchText),
      },
    },
  };
}
