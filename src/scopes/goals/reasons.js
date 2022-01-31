import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const reasonFilter = `
SELECT DISTINCT g.id
FROM "ActivityReports" ar
INNER JOIN "ActivityReportObjectives" aro ON ar."id" = aro."activityReportId"
INNER JOIN "Objectives" o ON aro."objectiveId" = o.id
INNER JOIN "Goals" g ON o."goalId" = g.id
WHERE ARRAY_TO_STRING(ar."reason", ',')`;

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
