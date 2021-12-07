import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const grantNumberSql = 'SELECT "ActivityRecipients"."activityReportId" FROM "Grants" INNER JOIN "ActivityRecipients" ON "ActivityRecipients"."grantId" = "Grants"."id" WHERE "Grants".number';

export function withGrantNumber(numbers) {
  return {
    [Op.or]: [
      filterAssociation(grantNumberSql, numbers, false),
    ],
  };
}

export function withoutGrantNumber(numbers) {
  return {
    [Op.and]: [
      filterAssociation(grantNumberSql, numbers, true),
    ],
  };
}
