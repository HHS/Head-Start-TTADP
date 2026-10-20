import { Op } from 'sequelize';
import { sequelize } from '../../models';

const normalizeGoalTitles = (query: string[]) =>
  query
    .flatMap((title) => title.split(',').map((item) => item.trim()))
    .filter((title) => title.length > 0);

const goalTemplateScope = (query: string[], exclude = false) => {
  const normalizedTitles = normalizeGoalTitles(query);
  if (!normalizedTitles.length) {
    return {};
  }

  const escapedTitles = normalizedTitles.map((title) => sequelize.escape(title));
  const operator = exclude ? Op.notIn : Op.in;

  return {
    id: {
      [operator]: sequelize.literal(`(
        SELECT crg."collabReportId"
        FROM "CollabReportGoals" crg
        INNER JOIN "GoalTemplates" gt ON gt."id" = crg."goalTemplateId"
        WHERE crg."deletedAt" IS NULL
          AND gt."deletedAt" IS NULL
          AND gt."standard" IN (${escapedTitles.join(', ')})
      )`),
    },
  };
};

export const withGoal = (query: string[]) => goalTemplateScope(query);

export const withoutGoal = (query: string[]) => goalTemplateScope(query, true);
