import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const reasonFilter = `
SELECT "Objectives"."goalId" FROM "ActivityReportObjectives" 
INNER JOIN "Objectives" on "ActivityReportObjectives"."objectiveId" = "Objectives"."id" 
WHERE "ActivityReportObjectives"."activityReportId" 
IN (SELECT "id" from "ActivityReports" WHERE (ARRAY_TO_STRING(reason, ',')))`;

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
