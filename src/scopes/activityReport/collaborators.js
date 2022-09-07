import { filterAssociation } from './utils';
import { ENTITY_TYPES, COLLABORATOR_TYPES } from '../../constants';
// TODO: fix
const collaborators = `
SELECT
  "Collaborators"."entityId"
FROM "Users" "Users"
INNER JOIN "Collaborators" "Collaborators"
ON "Collaborators"."userId" = "Users"."id"
AND '${COLLABORATOR_TYPES.EDITOR}' = ANY ("Collaborators"."collaboratorTypes")
AND "Collaborators"."entityType" = '${ENTITY_TYPES.REPORT}'
WHERE "Users"."name"`;

export function withCollaborators(names) {
  return filterAssociation(collaborators, names, false);
}

export function withoutCollaborators(names) {
  return filterAssociation(collaborators, names, true);
}
