import { filterAssociation } from './utils';

const programSpecialist = `
SELECT DISTINCT "ActivityReportGoals"."goalId"
FROM "ActivityReportGoals"
INNER JOIN "ActivityReports"
ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
INNER JOIN "ActivityRecipients"
ON "ActivityRecipients"."activityReportId" = "ActivityReports"."id"
INNER JOIN "Grants"
ON "Grants"."id" = "ActivityRecipients"."grantId"
WHERE "Grants"."programSpecialistName"`;

export function withProgramSpecialist(names) {
  return filterAssociation(programSpecialist, names, false);
}

export function withoutProgramSpecialist(names) {
  return filterAssociation(programSpecialist, names, true);
}
