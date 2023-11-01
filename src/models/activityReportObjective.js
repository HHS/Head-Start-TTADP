const { Model } = require('sequelize');
const { GOAL_SUSPEND_REASONS: SUSPEND_REASONS } = require('@ttahub/common');
const { beforeDestroy, afterDestroy } = require('./hooks/activityReportObjective');

export default (sequelize, DataTypes) => {
  class ActivityReportObjective extends Model {
    static associate(models) {
      ActivityReportObjective.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportObjective.belongsTo(models.Objective, { foreignKey: 'objectiveId', as: 'objective' });
      ActivityReportObjective.hasMany(models.ActivityReportObjectiveFile, { foreignKey: 'activityReportObjectiveId', as: 'activityReportObjectiveFiles' });
      ActivityReportObjective.hasMany(models.ActivityReportObjectiveTopic, { foreignKey: 'activityReportObjectiveId', as: 'activityReportObjectiveTopics' });
      ActivityReportObjective.hasMany(models.ActivityReportObjectiveResource, { foreignKey: 'activityReportObjectiveId', as: 'activityReportObjectiveResources' });

      ActivityReportObjective.belongsToMany(models.File, {
        through: models.ActivityReportObjectiveFile,
        foreignKey: 'activityReportObjectiveId',
        otherKey: 'fileId',
        as: 'files',
      });
      ActivityReportObjective.belongsToMany(models.Topic, {
        through: models.ActivityReportObjectiveTopic,
        foreignKey: 'activityReportObjectiveId',
        otherKey: 'topicId',
        as: 'topics',
      });
      ActivityReportObjective.belongsToMany(models.Resource, {
        through: models.ActivityReportObjectiveResource,
        foreignKey: 'activityReportObjectiveId',
        otherKey: 'resourceId',
        as: 'resources',
      });
      ActivityReportObjective.belongsTo(models.Objective, {
        foreignKey: 'originalObjectiveId',
        as: 'originalObjective',
      });
    }
  }
  ActivityReportObjective.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    objectiveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    arOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    suspendReason: {
      allowNull: true,
      type: DataTypes.ENUM(SUSPEND_REASONS),
    },
    suspendContext: {
      type: DataTypes.TEXT,
    },
    title: DataTypes.TEXT,
    status: DataTypes.STRING,
    ttaProvided: DataTypes.TEXT,
    originalObjectiveId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: {
          tableName: 'Objectives',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'ActivityReportObjective',
    hooks: {
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ActivityReportObjective;
};
