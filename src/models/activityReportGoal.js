const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActivityReportGoal extends Model {
    static associate() {
    }
  }
  ActivityReportGoal.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportGoal',
  });
  return ActivityReportGoal;
};
