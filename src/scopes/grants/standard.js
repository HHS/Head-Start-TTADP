import { Op } from 'sequelize';
import { CREATION_METHOD } from '../../constants';
import { sequelize } from '../../models';

// Correlated to the outer "Grant" row (Sequelize's default alias for the model) so
// matches don't leak across regions for the same recipient.
const matchingGrantExistsForStandards = (standards) =>
  sequelize.literal(`EXISTS (
    SELECT 1
    FROM "Grants" AS "MatchingGrants"
    INNER JOIN "Goals"
      ON "Goals"."grantId" = "MatchingGrants"."id"
    INNER JOIN "GoalTemplates"
      ON "Goals"."goalTemplateId" = "GoalTemplates"."id"
    WHERE "Goals"."deletedAt" IS NULL
      AND "GoalTemplates"."deletedAt" IS NULL
      AND "MatchingGrants"."recipientId" = "Grant"."recipientId"
      AND "MatchingGrants"."regionId" = "Grant"."regionId"
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
      [Op.or]: [matchingGrantExistsForStandards(standards), allStandardsSelected(standards)],
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
        sequelize.literal(`NOT ${matchingGrantExistsForStandards(standards).val}`),
        sequelize.literal(`NOT ${allStandardsSelected(standards).val}`),
      ],
    },
  };
}
