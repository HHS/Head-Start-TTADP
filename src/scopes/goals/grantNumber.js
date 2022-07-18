import { Op } from 'sequelize';
import { sequelize } from '../../models';

const grantNumberQuery = `
  SELECT
    "Goals"."id"
  FROM "Goals" "Goals"
  INNER JOIN "Grants" "Grants"
  ON "Goals"."grantId" = "Grants"."id"
  WHERE "Grants"."number"`;

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
