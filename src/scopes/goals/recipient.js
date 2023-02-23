import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const recipientName = `
SELECT DISTINCT "ActivityReportGoals"."goalId"
FROM "ActivityReportGoals"
INNER JOIN "ActivityReports"
ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
INNER JOIN "ActivityRecipients"
ON "ActivityRecipients"."activityReportId" = "ActivityReports"."id"
INNER JOIN "Grants"
ON "Grants"."id" = "ActivityRecipients"."grantId"
INNER JOIN "Recipients"
ON "Recipients"."id" = "Grants"."recipientId"
WHERE "Recipients".NAME`;

const otherEntityName = `
SELECT DISTINCT "ActivityReportGoals"."goalId"
FROM "ActivityReportGoals"
INNER JOIN "ActivityReports"
ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
INNER JOIN "ActivityRecipients"
ON "ActivityRecipients"."activityReportId" = "ActivityReports"."id"
INNER JOIN "OtherEntities"
ON "OtherEntities"."id" = "ActivityRecipients"."otherEntityId"
WHERE "OtherEntities".NAME`;

export function withRecipientName(names) {
  return {
    [Op.or]: [
      filterAssociation(recipientName, names, false),
      filterAssociation(otherEntityName, names, false),
    ],
  };
}

export function withoutRecipientName(names) {
  return {
    [Op.and]: [
      filterAssociation(recipientName, names, true),
      filterAssociation(otherEntityName, names, true),
    ],
  };
}
