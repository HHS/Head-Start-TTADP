const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActivityReportFile extends Model {
    static associate(models) {
      ActivityReportFile.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'files' });
    }
  }
  ActivityReportFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportId: {
      type: DataTypes.INTEGER,
    },
    fileId: {
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportFile',
  });
  return ActivityReportFile;
};
