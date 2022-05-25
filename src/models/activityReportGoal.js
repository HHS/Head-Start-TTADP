const { Model } = require('sequelize');
const { afterCreate, afterUpdate, afterUpsert } = require('./hooks/activityReportGoal');

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
    },
    goalId: {
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportGoal',
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      afterUpsert: async (instance, options) => afterUpsert(sequelize, instance, options),
    },
  });
  return ActivityReportGoal;
};
