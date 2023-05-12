const { Model } = require('sequelize');
const { beforeValidate, afterCreate } = require('./hooks/resource');

export default (sequelize, DataTypes) => {
  class Resource extends Model {
    static associate(models) {
      Resource.hasMany(models.ActivityReportResource, { foreignKey: 'resourceId', as: 'activityReportResources' });
      Resource.belongsToMany(models.ActivityReport, {
        through: models.ActivityReportResource,
        foreignKey: 'resourceId',
        otherKey: 'activityReportId',
        as: 'activityReports',
      });
      Resource.hasMany(models.ActivityReportGoalResource, { foreignKey: 'resourceId', as: 'activityReportGoalResources' });
      Resource.belongsToMany(models.ActivityReportGoal, {
        through: models.ActivityReportGoalResource,
        foreignKey: 'resourceId',
        otherKey: 'activityReportGoalId',
        as: 'activityReportGoals',
      });
      Resource.hasMany(models.ActivityReportObjectiveResource, { foreignKey: 'resourceId', as: 'activityReportObjectiveResources' });
      Resource.belongsToMany(models.ActivityReportObjective, {
        through: models.ActivityReportObjectiveResource,
        foreignKey: 'resourceId',
        otherKey: 'activityReportObjectiveId',
        as: 'activityReportObjectives',
      });
      Resource.hasMany(models.NextStepResource, { foreignKey: 'resourceId', as: 'nextStepResources' });
      Resource.belongsToMany(models.NextStep, {
        through: models.NextStepResource,
        foreignKey: 'resourceId',
        otherKey: 'nextStepId',
        as: 'nextSteps',
      });
      Resource.hasMany(models.GoalResource, { foreignKey: 'resourceId', as: 'goalResources' });
      Resource.belongsToMany(models.Goal, {
        through: models.GoalResource,
        foreignKey: 'resourceId',
        otherKey: 'goalId',
        as: 'goals',
      });
      Resource.hasMany(models.GoalTemplateResource, { foreignKey: 'resourceId', as: 'goalTemplateResources' });
      Resource.belongsToMany(models.GoalTemplate, {
        through: models.GoalTemplateResource,
        foreignKey: 'resourceId',
        otherKey: 'goalTemplateId',
        as: 'goalTemplates',
      });
      Resource.hasMany(models.ObjectiveResource, { foreignKey: 'resourceId', as: 'objectiveResources' });
      Resource.belongsToMany(models.Objective, {
        through: models.ObjectiveResource,
        foreignKey: 'resourceId',
        otherKey: 'objectiveId',
        as: 'objectives',
      });
      Resource.hasMany(models.ObjectiveTemplateResource, { foreignKey: 'resourceId', as: 'objectiveTemplateResources' });
      Resource.belongsToMany(models.ObjectiveTemplate, {
        through: models.ObjectiveTemplateResource,
        foreignKey: 'resourceId',
        otherKey: 'objectiveTemplateId',
        as: 'objectiveTemplates',
      });
    }
  }
  Resource.init({
    domain: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    url: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    title: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
  }, {
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
    },
    sequelize,
    modelName: 'Resource',
  });
  return Resource;
};
