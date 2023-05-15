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
      models.File.hasMany(models.ReportObjectiveFile, {
        foreignKey: 'fileId',
        as: 'reportObjectiveFiles',
      });
      models.ReportObjective.belongsToMany(models.File, {
        through: models.ReportObjectiveFile,
        foreignKey: 'reportObjectiveId',
        otherKey: 'fileId',
        as: 'files',
      });
      models.File.belongsToMany(models.ReportObjective, {
        through: models.ReportObjectiveFile,
        foreignKey: 'fileId',
        otherKey: 'reportObjectiveId',
        as: 'reportObjectives',
      });
    }
  }
  ReportObjectiveFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    reportObjectiveId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    objectiveFileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ReportObjectiveFile',
  });
  return ReportObjectiveFile;
};
