import { Op } from 'sequelize';
import { sequelize } from '../../models';

const standardQuery = `
  SELECT "Goals"."id"
  FROM "Goals" "Goals"
  INNER JOIN "GoalTemplates" "GoalTemplates"
  ON "Goals"."goalTemplateId" = "GoalTemplates"."id"
  WHERE "GoalTemplates"."standard"`;

export function withStandard(standards) {
  return {
    [Op.or]: sequelize.literal(
      `"Goal"."id" in (${standardQuery} in (${standards.map((s) => sequelize.escape(s)).join(',')}))`,
    ),
  };
}

export function withoutStandard(standards) {
  return {
    [Op.and]: sequelize.literal(
      `"Goal"."id" not in (${standardQuery} in (${standards.map((s) => sequelize.escape(s)).join(',')}))`,
    ),
  };
}
