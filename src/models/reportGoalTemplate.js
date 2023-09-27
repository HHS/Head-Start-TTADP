const {
  Model,
  Op,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportGoalTemplate extends Model {
    static associate(models) {
      automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportGoalTemplate.init({
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
    goalTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'GoalTemplates',
        },
        key: 'id',
      },
    },
    templateName: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    timeframe: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    isActivelyEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ReportGoalTemplate',
  });
  return ReportGoalTemplate;
};
