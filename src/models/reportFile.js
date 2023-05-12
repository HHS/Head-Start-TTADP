const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ReportFile extends Model {
    static associate(models) {
      ReportFile.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportFile.belongsTo(models.File, {
        foreignKey: 'fileId',
        as: 'file',
      });

      models.Report.hasMany(models.ReportFile, {
        foreignKey: 'reportId',
        as: 'reportFiles',
      });
      models.Report.belongsToMany(models.File, {
        through: models.ReportFile,
        foreignKey: 'reportId',
        as: 'files',
      });

      models.File.hasMany(models.ReportFile, {
        foreignKey: 'fileId',
        as: 'reportFiles',
      });
      models.File.belongsToMany(models.Report, {
        through: models.ReportFile,
        foreignKey: 'fileId',
        otherKey: 'reportId',
        as: 'reports',
      });
    }
  }
  ReportFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    reportId: {
      type: DataTypes.BIGINT,
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
