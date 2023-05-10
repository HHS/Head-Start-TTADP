const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ReportFile extends Model {
    static associate(models) {
      ReportFile.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      ReportFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' });
    }
  }
  ReportFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ReportFile',
  });
  return ReportFile;
};
