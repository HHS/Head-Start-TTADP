const {
  Model,
  Op,
} = require('sequelize');
const {
  ENTITY_TYPE,
} = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTemplate extends Model {
    static associate(models) {
      automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportObjectiveTemplate.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    objectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'ObjectiveTemplates',
        },
        key: 'id',
      },
    },
    reportGoalTemplateId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'ReportGoalTemplates',
        },
        key: 'id',
      },
    },
    supportTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'SupportTypes',
        },
        key: 'id',
      },
    },
    templateTitle: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActivelyEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ReportObjectiveTemplate',
  });
  return ReportObjectiveTemplate;
};
