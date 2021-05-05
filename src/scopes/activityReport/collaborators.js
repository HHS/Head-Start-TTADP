import filterArray from './utils';

const collaborators = '(SELECT STRING_AGG("Users".name, \',\') FROM "Users" INNER JOIN "ActivityReportCollaborators" ON "Users"."id" = "ActivityReportCollaborators"."userId" AND "ActivityReport"."id" = "ActivityReportCollaborators"."activityReportId" GROUP BY "ActivityReport"."id")';

export function withCollaborators(names) {
  return filterArray(collaborators, names, false);
}

export function withoutCollaborators(names) {
  return filterArray(collaborators, names, true);
}
