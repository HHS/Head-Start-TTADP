import filterArray from './utils';

const programSpecialist = '(SELECT string_agg("Grants"."programSpecialistName", \',\') FROM "ActivityRecipients" JOIN "Grants" ON "ActivityRecipients"."grantId" = "Grants".id WHERE "ActivityReport"."id" = "ActivityRecipients"."activityReportId" GROUP BY "ActivityRecipients"."activityReportId")';

export function withProgramSpecialist(names) {
  return filterArray(programSpecialist, names, false);
}

export function withoutProgramSpecialist(names) {
  return filterArray(programSpecialist, names, true);
}
