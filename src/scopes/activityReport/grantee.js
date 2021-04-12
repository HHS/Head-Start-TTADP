import { Op } from 'sequelize';
import filterArray from './utils';

const granteeName = '(SELECT STRING_AGG("Grantees".name, \',\') FROM "Grantees" INNER JOIN "ActivityRecipients" ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId" JOIN "Grants" ON "Grants"."id" = "ActivityRecipients"."grantId" AND "Grantees"."id" = "Grants"."granteeId" GROUP BY "ActivityRecipients"."activityReportId")';
const nonGranteeName = '(SELECT STRING_AGG("NonGrantees".name, \',\') FROM "NonGrantees" INNER JOIN "ActivityRecipients" ON "NonGrantees"."id" = "ActivityRecipients"."nonGranteeId" AND "ActivityRecipients"."activityReportId" = "ActivityReport"."id" GROUP BY "ActivityRecipients"."activityReportId")';

export function withGranteeName(names) {
  const grantees = filterArray(granteeName, names, false);
  const nonGrantees = filterArray(nonGranteeName, names, false);

  return {
    [Op.or]: [
      grantees,
      nonGrantees,
    ],
  };
}

export function withoutGranteeName(names) {
  const grantees = filterArray(granteeName, names, true);
  const nonGrantees = filterArray(nonGranteeName, names, true);
  return {
    [Op.and]: [
      grantees,
      nonGrantees,
    ],
  };
}
