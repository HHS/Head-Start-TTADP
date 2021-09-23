import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const granteeName = 'SELECT "ActivityRecipients"."activityReportId" FROM "Grantees" INNER JOIN "Grants" ON "Grants"."granteeId" = "Grantees"."id" INNER JOIN "ActivityRecipients" ON "ActivityRecipients"."grantId" = "Grants"."id" WHERE "Grantees".NAME';
const nonGranteeName = 'SELECT "ActivityRecipients"."activityReportId" FROM "NonGrantees" INNER JOIN "ActivityRecipients" ON "ActivityRecipients"."nonGranteeId" = "NonGrantees"."id" WHERE "NonGrantees".NAME';

export function withGranteeName(names) {
  return {
    [Op.or]: [
      filterAssociation(granteeName, names, false),
      filterAssociation(nonGranteeName, names, false),
    ],
  };
}

export function withoutGranteeName(names) {
  return {
    [Op.and]: [
      filterAssociation(granteeName, names, true),
      filterAssociation(nonGranteeName, names, true),
    ],
  };
}
