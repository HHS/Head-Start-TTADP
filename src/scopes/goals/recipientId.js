/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
import { sequelize } from '../../models';

const recipientQuery = 'SELECT "Goals"."id" FROM "Goals" INNER JOIN "GrantGoals" ON "GrantGoals"."goalId" = "Goals"."id" INNER JOIN "Grants" ON "Grants"."id" = "GrantGoals"."grantId" WHERE "Grants"."recipientId"';

export function withRecipientId(ids) {
  return {
    [Op.or]: sequelize.literal(`"Goal"."id" IN (${recipientQuery} in (${ids.map((id) => sequelize.escape(id)).join(',')}))`),
  };
}
