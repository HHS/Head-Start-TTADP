const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ReportObjectiveFile extends Model {
    static associate(models) {
      ReportObjectiveFile.belongsTo(
        models.ReportObjective,
        {
          foreignKey: 'reportObjectiveId',
          as: 'reportObjective',
          onDelete: 'cascade',
        },
      );
      ReportObjectiveFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' });
    }
  }
  ReportObjectiveFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    reportObjectiveId: {
      type: DataTypes.INTEGER,
    },
    fileId: {
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'ReportObjectiveFile',
  });
  return ReportObjectiveFile;
};
