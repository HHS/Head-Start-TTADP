const { Model } = require('sequelize');
const { CLOSE_SUSPEND_REASONS } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
const { afterDestroy } = require('./hooks/activityReportGoal');

module.exports = (sequelize, DataTypes) => {
  class ActivityReportGoal extends Model {
    static associate(models) {
      ActivityReportGoal.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportGoal.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' });
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
    timeframe: DataTypes.STRING,
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
    isActivelyEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportGoal',
    hooks: {
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ActivityReportGoal;
};
