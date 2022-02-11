import { Op } from 'sequelize';
import { sequelize } from '../../models';

const grantNumberQuery = 'SELECT "Goals"."id" FROM "Goals" INNER JOIN "GrantGoals" ON "GrantGoals"."goalId" = "Goals"."id" INNER JOIN "Grants" ON "Grants"."id" = "GrantGoals"."grantId" WHERE "Grants"."number"';

export function withGrantNumber(grantNumber) {
  return {
    [Op.or]: sequelize.literal(`"Goal"."id" in (${grantNumberQuery} ILIKE ${sequelize.escape(`%${grantNumber}%`)})`),
  };
}

export function withoutGrantNumber(grantNumber) {
  return {
    [Op.and]: sequelize.literal(`"Goal"."id" not in (${grantNumberQuery} ILIKE ${sequelize.escape(`%${grantNumber}%`)})`),
  };
}
