import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const recipientNameFilter = `
SELECT "Grant"."id" FROM "Grants" as "Grant"
INNER JOIN "Recipients" as "Recipient" ON "Recipient"."id" = "Grant"."recipientId"
WHERE "Recipient"."name"
`;

export function withRecipientName(name) {
  return {
    [Op.or]: [
      filterAssociation(recipientNameFilter, name, false),
    ],
  };
}

export function withoutRecipientName(name) {
  return {
    [Op.and]: [
      filterAssociation(recipientNameFilter, name, true),
    ],
  };
}
