import { Op } from 'sequelize';
import { filterAssociation } from './utils';

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

export function withReasons(reasons) {
  return {
    [Op.or]: [
      filterAssociation(reasonFilter, reasons, false),
    ],
  };
}

export function withoutReasons(reasons) {
  return {
    [Op.and]: [
      filterAssociation(reasonFilter, reasons, true),
    ],
  };
}
