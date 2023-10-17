const { Model } = require('sequelize');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTemplateFile extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportObjectiveTemplateFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    reportObjectiveTemplateId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportObjectiveTemplates',
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
    objectiveTemplateFileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'ObjectiveTemplateFiles',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'ReportObjectiveTemplateFile',
  });
  return ReportObjectiveTemplateFile;
};
