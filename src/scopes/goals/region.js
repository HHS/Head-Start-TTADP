import { Op } from 'sequelize';
import { sequelize } from '../../models';

const regionQuery = 'SELECT "Goals"."id" FROM "Goals" INNER JOIN "GrantGoals" ON "GrantGoals"."goalId" = "Goals"."id" INNER JOIN "Grants" ON "Grants"."id" = "GrantGoals"."grantId" WHERE "Grants"."regionId"';

export function withRegion(ids) {
  return {
    [Op.or]: sequelize.literal(`"Goal"."id" in (${regionQuery} in (${ids.map((id) => sequelize.escape(id)).join(',')}))`),
  };
}

export function withoutRegion(ids) {
  return {
    [Op.and]: sequelize.literal(`"Goal"."id" not in (${regionQuery} in (${ids.map((id) => sequelize.escape(id)).join(',')}))`),
  };
}
