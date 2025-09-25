/* eslint-disable import/prefer-default-export */
import { filterAssociation } from './utils';

const creators = `
SELECT
 DISTINCT erp."id"
FROM "NationalCenters" "NationalCenters"
INNER JOIN "NationalCenterUsers" "NationalCenterUsers"
ON "NationalCenters".id = "NationalCenterUsers"."nationalCenterId"
INNER JOIN "TrainingReports" erp
ON erp."ownerId"="NationalCenterUsers"."userId"
WHERE "NationalCenters"."name"`;

export function withCreators(names) {
  return filterAssociation(creators, names, false, 'ILIKE');
}
