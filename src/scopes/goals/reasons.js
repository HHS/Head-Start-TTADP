import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const reasonFilter = `
SELECT "Objectives"."goalId" FROM "ActivityReportObjectives" 
INNER JOIN "Objectives" on "ActivityReportObjectives"."objectiveId" = "Objectives"."id" 
INNER JOIN "ActivityReports" ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"
WHERE ARRAY_TO_STRING("ActivityReports"."reason", ',')`; // ~* var reasons

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
