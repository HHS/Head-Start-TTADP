import { filterAssociation } from './utils';

const collaborators = `
WITH
unnested_collaborators AS (
    SELECT "id",unnest("collaboratorIds") FROM "EventReportPilots"
)
SELECT
 DISTINCT arr1."id"
FROM "NationalCenters" "NationalCenters"
INNER JOIN "NationalCenterUsers" "NationalCenterUsers"
ON "NationalCenters".id = "NationalCenterUsers"."nationalCenterId"
INNER JOIN unnested_collaborators arr1
ON arr1.unnest="NationalCenterUsers"."userId"
WHERE "NationalCenters"."name"`;

export function withCollaborators(names) {
  return filterAssociation(collaborators, names, false, 'ILIKE');
}

export function withoutCollaborators(names) {
  return filterAssociation(collaborators, names, true, 'ILIKE');
}
