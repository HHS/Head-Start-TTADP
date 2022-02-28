import { Op } from 'sequelize';
import { sequelize } from '../../models';

const grantNumberQuery = 'SELECT "Goals"."id" FROM "Goals" INNER JOIN "GrantGoals" ON "GrantGoals"."goalId" = "Goals"."id" INNER JOIN "Grants" ON "Grants"."id" = "GrantGoals"."grantId" WHERE "Grants"."number"';

export function withGrantNumber(grantNumber) {
  const numbers = grantNumber.map((gn) => sequelize.escape(`%${gn}%`));

  return {
    [Op.or]: sequelize.literal(`"Goal"."id" in (${grantNumberQuery} ILIKE ANY(ARRAY[${numbers.join(',')}]))`),
  };
}

export function withoutGrantNumber(grantNumber) {
  const numbers = grantNumber.map((gn) => sequelize.escape(`%${gn}%`));
  return {
    [Op.and]: sequelize.literal(`"Goal"."id" not in (${grantNumberQuery} ILIKE ANY(ARRAY[${numbers.join(',')}]))`),
  };
}
