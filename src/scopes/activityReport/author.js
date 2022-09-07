import { filterAssociation } from './utils';
import { ENTITY_TYPES, COLLABORATOR_TYPES } from '../../constants';
// TODO: fix
const author = `
SELECT
  "Collaborators"."entityId"
FROM "Users" "Users"
INNER JOIN "Collaborators" "Collaborators"
ON "Collaborators"."userId" = "Users"."id"
AND '${COLLABORATOR_TYPES.OWNER}' = ANY ("Collaborators"."collaboratorTypes")
AND "Collaborators"."entityType" = '${ENTITY_TYPES.REPORT}'
WHERE "Users".name`;

export function withAuthor(names) {
  return filterAssociation(author, names, false);
}

export function withoutAuthor(names) {
  return filterAssociation(author, names, true);
}
