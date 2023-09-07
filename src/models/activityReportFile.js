const { Model } = require('sequelize');
const { beforeDestroy, afterDestroy } = require('./hooks/activityReportFile');

export default (sequelize, DataTypes) => {
  class ActivityReportFile extends Model {
    static associate(models) {
      ActivityReportFile.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' });
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
      allowNull: false,
      references: { model: { tableName: 'ActivityReports' }, key: 'id' },
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: { tableName: 'Files' }, key: 'id' },
    },
  }, {
    sequelize,
    modelName: 'ActivityReportFile',
    hooks: {
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ActivityReportFile;
};
