import { Op } from 'sequelize';
import { filterAssociation } from './utils';

export default function withRecipientId(id) {
  const query = 'SELECT "ActivityRecipients"."activityReportId" FROM "Recipients" INNER JOIN "Grants" ON "Grants"."recipientId" = "Recipients"."id" INNER JOIN "ActivityRecipients" ON "ActivityRecipients"."grantId" = "Grants"."id" WHERE "Recipients".id';

  return {
    [Op.and]: filterAssociation(query, id, false, '='),
  };
}
