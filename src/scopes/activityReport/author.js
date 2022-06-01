import { filterAssociation } from './utils';

const author = `
SELECT
  "ActivityReports"."id"
FROM "Users" "Users"
INNER JOIN "ActivityReports" "ActivityReports"
ON "ActivityReports"."userId" = "Users"."id"
WHERE "Users".name`;

export function withAuthor(names) {
  return filterAssociation(author, names, false);
}

export function withoutAuthor(names) {
  return filterAssociation(author, names, true);
}
