import { Op } from 'sequelize';
import { CREATION_METHOD } from '../../constants';
import { sequelize } from '../../models';

const standardQuery = `
  SELECT "Goals"."id"
  FROM "Goals" "Goals"
  INNER JOIN "GoalTemplates" "GoalTemplates"
  ON "Goals"."goalTemplateId" = "GoalTemplates"."id"
  WHERE "GoalTemplates"."standard"`;

function allStandardsSelected(standards) {
  const values = standards.map((standard) => sequelize.escape(standard)).join(',');
  return `NOT EXISTS (
    SELECT 1
    FROM "GoalTemplates"
    INNER JOIN "Goals"
      ON "Goals"."goalTemplateId" = "GoalTemplates"."id"
    WHERE "GoalTemplates"."creationMethod" = ${sequelize.escape(CREATION_METHOD.CURATED)}
      AND "GoalTemplates"."deletedAt" IS NULL
      AND "GoalTemplates"."standard" IS NOT NULL
      AND "GoalTemplates"."standard" <> ''
      AND "GoalTemplates"."standard" NOT IN (${values})
  )`;
}

export function withStandard(standards) {
  if (!standards.length) {
    return {
      [Op.and]: sequelize.literal('1=0'),
    };
  }

  return {
    [Op.or]: sequelize.literal(
      `("Goal"."id" in (${standardQuery} in (${standards.map((s) => sequelize.escape(s)).join(',')})) OR ${allStandardsSelected(standards)})`
    ),
  };
}

export function withoutStandard(standards) {
  if (!standards.length) {
    return {
      [Op.and]: sequelize.literal('1=1'),
    };
  }

  return {
    [Op.and]: sequelize.literal(
      `("Goal"."id" not in (${standardQuery} in (${standards.map((s) => sequelize.escape(s)).join(',')})) AND NOT ${allStandardsSelected(standards)})`
    ),
  };
}
