import { Op } from 'sequelize';
import { CREATION_METHOD } from '../../constants';
import { sequelize } from '../../models';

// The (recipientId, regionId) pair is written unqualified so Sequelize resolves it
// against whichever alias the caller uses for the Grant model (e.g. "Grant" for
// direct grant queries, "grants" when included from Recipient). The pairing (rather
// than separate recipientId/regionId checks) keeps matches from leaking across a
// recipient's other regions.
const matchingRecipientRegionPairsForStandards = (standards) =>
  sequelize.literal(`("recipientId", "regionId") IN (
    SELECT DISTINCT "MatchingGrants"."recipientId", "MatchingGrants"."regionId"
    FROM "Grants" AS "MatchingGrants"
    INNER JOIN "Goals" AS "MatchingGoals"
      ON "MatchingGoals"."grantId" = "MatchingGrants"."id"
    INNER JOIN "GoalTemplates" AS "MatchingGoalTemplates"
      ON "MatchingGoals"."goalTemplateId" = "MatchingGoalTemplates"."id"
    WHERE "MatchingGoals"."deletedAt" IS NULL
      AND "MatchingGoalTemplates"."deletedAt" IS NULL
      AND "MatchingGoalTemplates"."standard" IN (${standards
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
        matchingRecipientRegionPairsForStandards(standards),
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
        sequelize.literal(`NOT ${matchingRecipientRegionPairsForStandards(standards).val}`),
        sequelize.literal(`NOT ${allStandardsSelected(standards).val}`),
      ],
    },
  };
}
