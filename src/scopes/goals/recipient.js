import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const recipientName = `
SELECT DISTINCT "Goals"."id"
FROM "Goals"
INNER JOIN "Grants"
ON "Grants"."id" = "Goals"."grantId"
INNER JOIN "Recipients"
ON "Recipients"."id" = "Grants"."recipientId"
WHERE "Recipients".NAME`;

export function withRecipientName(names) {
  return {
    [Op.and]: [
      filterAssociation(recipientName, names, false),
    ],
  };
}

export function withoutRecipientName(names) {
  return {
    [Op.and]: [
      filterAssociation(recipientName, names, true),
    ],
  };
}
