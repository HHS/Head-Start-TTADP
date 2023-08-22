const { Model } = require('sequelize');
const { generateJunctionTableAssociations } = require('./helpers/associations');

export default (sequelize, DataTypes) => {
  class ReportObjectiveFile extends Model {
    static associate(models) {
      generateJunctionTableAssociations(
        models.ReportObjectiveFile,
        [
          models.ReportObjective,
          models.File,
        ],
      );
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
      references: {
        model: {
          tableName: 'ReportObjectives',
        },
        key: 'id',
      },
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Files',
        },
        key: 'id',
      },
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
