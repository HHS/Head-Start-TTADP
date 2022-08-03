const { Model } = require('sequelize');

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
    status: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'ActivityReportGoal',
  });
  return ActivityReportGoal;
};
