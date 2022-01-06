import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const recipientName = 'SELECT "ActivityRecipients"."activityReportId" FROM "Recipients" INNER JOIN "Grants" ON "Grants"."recipientId" = "Recipients"."id" INNER JOIN "ActivityRecipients" ON "ActivityRecipients"."grantId" = "Grants"."id" WHERE "Recipients".NAME';
const otherEntityName = 'SELECT "ActivityRecipients"."activityReportId" FROM "OtherEntities" INNER JOIN "ActivityRecipients" ON "ActivityRecipients"."otherEntityId" = "OtherEntities"."id" WHERE "OtherEntities".NAME';

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
