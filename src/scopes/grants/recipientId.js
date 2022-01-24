import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const recipientIdFilter = `
SELECT "Grant"."id" FROM "Grants" as "Grant"
INNER JOIN "Recipients" as "Recipient" ON "Recipient"."id" = "Grant"."recipientId"
WHERE "Recipient"."id"::varchar(255)`;

export function withRecipientId(id) {
  return {
    [Op.or]: [
      filterAssociation(recipientIdFilter, id, false),
    ],
  };
}

export function withoutRecipientId(id) {
  return {
    [Op.and]: [
      filterAssociation(recipientIdFilter, id, true),
    ],
  };
}
