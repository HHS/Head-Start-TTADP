const { Model } = require('sequelize');
const { CLOSE_SUSPEND_REASONS, GOAL_SOURCES } = require('@ttahub/common');
const { formatDate } = require('../lib/modelHelpers');
const {
  afterCreate,
  beforeDestroy,
  afterDestroy,
  afterUpdate,
  beforeValidate,
} = require('./hooks/activityReportGoal');

export default (sequelize, DataTypes) => {
  class ActivityReportGoal extends Model {
    static associate(models) {
      ActivityReportGoal.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportGoal.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' });
      ActivityReportGoal.hasMany(models.ActivityReportGoalResource, { foreignKey: 'activityReportGoalId', as: 'activityReportGoalResources' });
      ActivityReportGoal.hasMany(models.ActivityReportGoalFieldResponse, { foreignKey: 'activityReportGoalId', as: 'activityReportGoalFieldResponses' });
      ActivityReportGoal.belongsToMany(models.Resource, {
        through: models.ActivityReportGoalResource,
        foreignKey: 'activityReportGoalId',
        otherKey: 'resourceId',
        as: 'resources',
      });
      ActivityReportGoal.belongsTo(models.Goal, {
        foreignKey: 'originalGoalId',
        as: 'originalGoal',
      });
    }
  }
  ActivityReportGoal.init({
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
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isRttapa: {
      type: DataTypes.ENUM(['Yes', 'No']),
      allowNull: true,
    },
    name: DataTypes.TEXT,
    status: DataTypes.STRING,
    timeframe: DataTypes.TEXT,
    closeSuspendReason: {
      allowNull: true,
      type: DataTypes.ENUM(Object.keys(CLOSE_SUSPEND_REASONS).map((k) => CLOSE_SUSPEND_REASONS[k])),
    },
    endDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    closeSuspendContext: {
      type: DataTypes.TEXT,
    },
    source: {
      type: DataTypes.ENUM(GOAL_SOURCES),
    },
    isActivelyEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
    originalGoalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: {
          tableName: 'Goals',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'ActivityReportGoal',
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
  });
  return ActivityReportGoal;
};
