/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
import { sequelize } from '../../models';

const recipientQuery = `
SELECT "Goals"."id"
FROM "Goals"
INNER JOIN "Grants"
ON "Goals"."grantId" = "Grants"."id"
WHERE "Grants"."recipientId"`;

export function withRecipientId(ids) {
  return {
    [Op.or]: sequelize.literal(`"Goal"."id" IN (${recipientQuery} in (${ids.map((id) => sequelize.escape(id)).join(',')}))`),
  };
}
