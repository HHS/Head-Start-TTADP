import { Op } from 'sequelize';
import { filterAssociation } from './utils';

export default function withGranteeId(id) {
  const query = 'SELECT "ActivityRecipients"."activityReportId" FROM "Grantees" INNER JOIN "Grants" ON "Grants"."granteeId" = "Grantees"."id" INNER JOIN "ActivityRecipients" ON "ActivityRecipients"."grantId" = "Grants"."id" WHERE "Grantees".id';

  return {
    [Op.and]: filterAssociation(query, id, false, '='),
  };
}
