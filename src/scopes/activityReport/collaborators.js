import { filterAssociation } from './utils';

const collaborators = 'SELECT "ActivityReportCollaborators"."activityReportId" FROM "Users" INNER JOIN "ActivityReportCollaborators" ON "ActivityReportCollaborators"."userId" = "Users"."id" WHERE "Users".name';

export function withCollaborators(names) {
  return filterAssociation(collaborators, names, false);
}

export function withoutCollaborators(names) {
  return filterAssociation(collaborators, names, true);
}
