const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTemplateFile extends Model {
    static associate(models) {
      ReportObjectiveTemplateFile.belongsTo(models.ReportObjectiveTemplate, {
        foreignKey: 'reportObjectiveTemplateId',
        as: 'reportObjectiveTemplate',
        onDelete: 'cascade',
      });
      ReportObjectiveTemplateFile.belongsTo(models.File, {
        foreignKey: 'fileId',
        as: 'file',
      });
      ReportObjectiveTemplateFile.belongsTo(models.ObjectiveTemplateFile, {
        foreignKey: 'objectiveTemplateFileId',
        as: 'objectiveTemplateFile',
      });
      models.ObjectiveTemplateFile.hasMany(models.ReportObjectiveTemplateFile, {
        foreignKey: 'objectiveTemplateFileId',
        as: 'reportObjectiveTemplateFiles',
      });

      models.ReportObjectiveTemplate.hasMany(models.ReportObjectiveTemplateFile, {
        foreignKey: 'reportObjectiveTemplateId',
        as: 'reportObjectiveTemplateFiles',
      });
      models.ReportObjectiveTemplate.belongsToMany(models.File, {
        through: models.ReportObjectiveTemplateFile,
        foreignKey: 'reportObjectiveTemplateId',
        otherKey: 'fileId',
        as: 'files',
      });

      models.File.hasMany(models.ReportObjectiveTemplateFile, {
        foreignKey: 'fileId',
        as: 'reportObjectiveTemplateFiles',
      });
      models.File.belongsToMany(models.ReportObjectiveTemplate, {
        through: models.ReportObjectiveTemplateFile,
        foreignKey: 'fileId',
        otherKey: 'reportObjectiveTemplateId',
        as: 'reportObjectiveTemplates',
      });
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
