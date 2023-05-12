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
      ReportObjectiveFile.belongsTo(models.File, {
        foreignKey: 'fileId',
        as: 'file',
      });

      models.ReportObjective.hasMany(models.ReportObjectiveFile, {
        foreignKey: 'reportObjectiveId',
        as: 'reportObjectiveFiles',
      });
      models.ReportObjective.belongsToMany(models.File, {
        through: models.ReportObjectiveFile,
        foreignKey: 'reportObjectiveId',
        otherKey: 'fileId',
        as: 'files',
      });
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
