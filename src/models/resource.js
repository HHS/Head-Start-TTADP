const { Model } = require('sequelize');
const { beforeValidate } = require('./hooks/resource');

module.exports = (sequelize, DataTypes) => {
  class Resource extends Model {
    static associate(models) {
      Resource.HasMany(models.ActivityReportResource, { foreignKey: 'resourceId', as: 'activityReportResources' });
      Resource.HasMany(models.ActivityReportObjectiveResource, { foreignKey: 'resourceId', as: 'activityReportObjectiveResources' });
      Resource.HasMany(models.NextStepResource, { foreignKey: 'resourceId', as: 'activityReportResources' });
      Resource.HasMany(models.ObjectiveResource, { foreignKey: 'resourceId', as: 'objectiveResources' });
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
