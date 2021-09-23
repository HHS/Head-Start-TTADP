import { filterAssociation } from './utils';

const programSpecialist = 'SELECT "ActivityRecipients"."activityReportId" FROM "ActivityRecipients" INNER JOIN "Grants" ON "Grants"."id" = "ActivityRecipients"."grantId" WHERE "Grants"."programSpecialistName"';

export function withProgramSpecialist(names) {
  return filterAssociation(programSpecialist, names, false);
}

export function withoutProgramSpecialist(names) {
  return filterAssociation(programSpecialist, names, true);
}
