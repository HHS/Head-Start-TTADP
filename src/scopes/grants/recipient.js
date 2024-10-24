import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const recipientNameFilter = `
SELECT
  "Grants"."id"
FROM "Grants" "Grants"
INNER JOIN "Recipients" "Recipients"
ON "Recipients"."id" = "Grants"."recipientId"
WHERE "Recipients"."name"`;

export function withRecipientName(name) {
  return {
    where: {
      [Op.or]: [
        filterAssociation(recipientNameFilter, name, false),
      ],
    },
  };
}

export function withoutRecipientName(name) {
  return {
    where: {
      [Op.and]: [
        filterAssociation(recipientNameFilter, name, true),
      ],
    },
  };
}
