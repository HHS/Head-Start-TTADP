const { Model } = require('sequelize');
const { beforeValidate } = require('./hooks/resource');

export default (sequelize, DataTypes) => {
  class Resource extends Model {
    static associate(models) {
      Resource.hasMany(models.ActivityReportResource, { foreignKey: 'resourceId', as: 'activityReportResources' });
      Resource.hasMany(models.ActivityReportGoalResource, { foreignKey: 'resourceId', as: 'activityReportGoalResources' });
      Resource.hasMany(models.ActivityReportObjectiveResource, { foreignKey: 'resourceId', as: 'activityReportObjectiveResources' });
      Resource.hasMany(models.NextStepResource, { foreignKey: 'resourceId', as: 'nextStepResources' });
      Resource.hasMany(models.GoalResource, { foreignKey: 'resourceId', as: 'goalResources' });
      Resource.hasMany(models.GoalTemplateResource, { foreignKey: 'resourceId', as: 'goalTemplateResources' });
      Resource.hasMany(models.ObjectiveResource, { foreignKey: 'resourceId', as: 'objectiveResources' });
      Resource.hasMany(models.ObjectiveTemplateResource, { foreignKey: 'resourceId', as: 'objectiveTemplateResources' });
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
  }, {
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
    },
    sequelize,
    modelName: 'Resource',
  });
  return Resource;
};
