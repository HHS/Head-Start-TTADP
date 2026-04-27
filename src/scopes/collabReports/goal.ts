import { Op } from 'sequelize';

const { Goal, GoalTemplate } = require('../../models');

const normalizeGoalTitles = (query: string) => query
  .split(',')
  .map((title) => title.trim())
  .filter((title) => title.length > 0);

export const withGoal = (query: string) => ({
  include: [{
    model: Goal,
    as: 'goals',
    include: [{
      model: GoalTemplate,
      as: 'goalTemplate',
      where: {
        templateName: {
          [Op.in]: normalizeGoalTitles(query),
        },
      },
    }],
  }],
});

export const withoutGoal = (query: string) => ({
  include: [{
    model: Goal,
    as: 'goals',
    include: [{
      model: GoalTemplate,
      as: 'goalTemplate',
      where: {
        templateName: {
          [Op.notIn]: normalizeGoalTitles(query),
        },
      },
    }],
  }],
});
