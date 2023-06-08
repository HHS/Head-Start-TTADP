import { filterAssociation } from './utils';

const collaborators = `
WITH unnested_collaborators AS (
    SELECT "id",unnest("collaboratorIds") FROM "EventReportPilots"
)
SELECT
 DISTINCT arr1."id"
FROM "Users" "Users"
    INNER JOIN unnested_collaborators arr1 ON arr1.unnest="Users"."id"
WHERE "Users"."name"`;

export function withCollaborators(names) {
  return filterAssociation(collaborators, names, false);
}

export function withoutCollaborators(names) {
  return filterAssociation(collaborators, names, true);
}
