import filterArray from './utils';

const granteeName = '(SELECT STRING_AGG("Grantees".name, \',\') FROM "Grantees" INNER JOIN "ActivityRecipients" ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId" JOIN "Grants" ON "Grants"."id" = "ActivityRecipients"."grantId" AND "Grantees"."id" = "Grants"."granteeId" GROUP BY "ActivityRecipients"."activityReportId")';

export function withGranteeName(names) {
  return filterArray(granteeName, names, false);
}

export function withoutGranteeName(names) {
  return filterArray(granteeName, names, true);
}
