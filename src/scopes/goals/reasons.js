import { Op } from 'sequelize';
import { filterAssociation } from './utils';

/*
const reasonFilter = `
SELECT
  DISTINCT "Goals"."id"
FROM "ActivityReports" "ActivityReports"
INNER JOIN "ActivityReportObjectives" "ActivityReportObjectives"
  ON "ActivityReports"."id" = "ActivityReportObjectives"."activityReportId"
INNER JOIN "Objectives" "Objective"
  ON "ActivityReportObjectives"."objectiveId" = "Objective"."id"
INNER JOIN "Goals" "Goals"
  ON "Objective"."goalId" = "Goals"."id"
WHERE ARRAY_TO_STRING("ActivityReports"."reason", ',')`;
*/

const reasonFilter = (options) => {
  const useRecipient = options && options.recipientId;
  return `
          SELECT DISTINCT g.id
          FROM "ActivityReports" ar
          INNER JOIN "ActivityReportGoals" arg ON ar.id = arg."activityReportId"
          INNER JOIN "Goals" g ON arg."goalId" = g.id
          INNER JOIN "Grants" gr ON g."grantId" = gr."id"
          WHERE ${useRecipient ? `gr."recipientId' = ${options.recipientId} AND ` : ''}
          ARRAY_TO_STRING(ar."reason", ',')`;
};

export function withReasons(reasons, options) {
  return {
    [Op.or]: [
      filterAssociation(reasonFilter(options), reasons, false),
    ],
  };
}

export function withoutReasons(reasons, options) {
  return {
    [Op.and]: [
      filterAssociation(reasonFilter(options), reasons, true),
    ],
  };
}
