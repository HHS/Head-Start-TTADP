import { Op } from 'sequelize';
import { CREATION_METHOD } from '../../constants';
import { sequelize } from '../../models';

const recipientIdsForStandards = (standards) =>
  sequelize.literal(`(
    SELECT DISTINCT "Grants"."recipientId"
    FROM "Grants"
    INNER JOIN "Goals"
      ON "Goals"."grantId" = "Grants"."id"
    INNER JOIN "GoalTemplates"
      ON "Goals"."goalTemplateId" = "GoalTemplates"."id"
    WHERE "Goals"."deletedAt" IS NULL
      AND "GoalTemplates"."deletedAt" IS NULL
      AND "GoalTemplates"."standard" IN (${standards
      .map((standard) => sequelize.escape(standard))
      .join(',')})
  )`);

const allStandardsSelected = (standards) =>
  sequelize.literal(`NOT EXISTS (
    SELECT 1
    FROM "GoalTemplates"
    WHERE "GoalTemplates"."creationMethod" = ${sequelize.escape(CREATION_METHOD.CURATED)}
      AND "GoalTemplates"."deletedAt" IS NULL
      AND "GoalTemplates"."standard" IS NOT NULL
      AND "GoalTemplates"."standard" <> ''
      AND "GoalTemplates"."standard" NOT IN (${standards
        .map((standard) => sequelize.escape(standard))
        .join(',')})
  )`);

export function withStandard(standards) {
  if (!standards.length) {
    return {
      where: { [Op.and]: sequelize.literal('1=0') },
    };
  }

  return {
    where: {
      [Op.or]: [
        { recipientId: { [Op.in]: recipientIdsForStandards(standards) } },
        allStandardsSelected(standards),
      ],
    },
  };
}

export function withoutStandard(standards) {
  if (!standards.length) {
    return {
      where: { [Op.and]: sequelize.literal('1=1') },
    };
  }

  return {
    where: {
      [Op.and]: [
        { recipientId: { [Op.notIn]: recipientIdsForStandards(standards) } },
        sequelize.literal(`NOT ${allStandardsSelected(standards).val}`),
      ],
    },
  };
}
