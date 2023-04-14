import activityReportGoalResource from '../activityReportGoalResource';

const { Sequelize } = require('sequelize');

const propagateOnAR = async (
  sequelize,
  instance,
  options,
) => sequelize.models.GoalFieldResponse.update(
  { onAR: true },
  {
    where: {
      goalTemplateFieldPromptId: instance.goalTemplateFieldPromptId,
      goalId: Sequelize.col('"goal->activityReportGoal"."goalId"'),
    },
    include: [{
      model: sequelize.models.Goal,
      as: 'goal',
      attributes: [],
      required: true,
      include: [{
        model: sequelize.models.ActivityReportGoal,
        as: 'activityReportGoal',
        attributes: [],
        required: true,
        where: { id: instance.activityReportGoalId },
      }],
    }],
    transaction: options.transaction,
  },
);

const recalculateOnAR = async (
  sequelize,
  instance,
  options,
) => sequelize.models.GoalFieldResponse.update(
  {
    onAR: Sequelize.literal(`(
      SELECT
        COUNT(arg.id) > 0 "onAR"
      FROM "Goals" g
      LEFT JOIN "ActivityReportGoals" arg
      ON g.id = arg."goalId"
      LEFT JOIN "ActivityReportGoalFieldResponses" argfr
      ON arg.id = argfr."activityReportGoalId"
      WHERE g.id = "GoalFieldResponse"."goalId"
      AND arg."id" != ${instance.activityReportGoalId}
      AND argfr."goalTemplateFieldPromptId" = ${instance.goalTemplateFieldPromptId}
      GROUP BY TRUE
    )`),
  },
  {
    where: { goalTemplateFieldPromptId: instance.goalTemplateFieldPromptId },
    include: [{
      model: sequelize.models.Goal,
      as: 'goal',
      attributes: [],
      required: true,
      include: [{
        model: sequelize.models.ActivityReportGoal,
        as: 'activityReportGoalResource',
        attributes: [],
        required: true,
        where: { id: instance.activityReportGoalId },
      }],
    }],
  },
);

const afterCreate = async (sequelize, instance, options) => Promise.all([
  propagateOnAR(sequelize, instance, options),
]);

const afterDestroy = async (sequelize, instance, options) => Promise.all([
  recalculateOnAR(sequelize, instance, options),
]);

export {
  propagateOnAR,
  recalculateOnAR,
  afterCreate,
  afterDestroy,
};
