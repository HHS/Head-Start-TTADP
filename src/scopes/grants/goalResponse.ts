import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';

// WARNING: Do not interpolate unvalidated input. Escaping is critical here.
function getSql(responses: string[]) {
  const validatedResponses = responses
    .filter((s) => typeof s === 'string' && s.trim().length > 0)
    .map((s) => `'${s.replace(/'/g, "''")}'`); // escape single quotes

  const placeholders = validatedResponses.length > 0 ? validatedResponses.join(', ') : '\'\'';

  return sequelize.literal(`(
    WITH unnested_responses AS (
      SELECT "goalId", unnest("response") AS res
      FROM "GoalFieldResponses"
    )
    SELECT DISTINCT "Goals"."grantId"
    FROM "Goals" "Goals"
    INNER JOIN unnested_responses arr
      ON arr."goalId" = "Goals"."id"
    WHERE arr."res" IN (${placeholders})
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
