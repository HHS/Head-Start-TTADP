const { Model } = require('sequelize');
const { PROMPT_FIELD_TYPE } = require('../constants');
const { generateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportGoalTemplateFieldPrompt extends Model {
    static associate(models) {
      generateJunctionTableAssociations(
        models.ReportGoalTemplateFieldPrompt,
        [
          models.ReportGoalTemplate,
          models.GoalTemplateFieldPrompt,
        ],
      );

      // TODO: think how to handle the related responses
      // ReportGoalTemplateFieldPrompt.hasMany(models.GoalFieldResponse, {
      //   foreignKey: 'goalTemplateFieldPromptId',
      //   as: 'responses',
      // });
      // ReportGoalTemplateFieldPrompt.hasMany(models.ReportGoalFieldResponse, {
      //   foreignKey: 'goalTemplateFieldPromptId',
      //   as: 'reportResponses',
      // });
      // ReportGoalTemplateFieldPrompt.belongsToMany(models.Goal, {
      //   through: models.GoalFieldResponse,
      //   foreignKey: 'goalTemplateFieldPromptId',
      //   otherKey: 'goalId',
      //   as: 'goals',
      // });
    }
  }
  ReportGoalTemplateFieldPrompt.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportGoalTemplateId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportGoalTemplates',
        },
        key: 'id',
      },
    },
    goalTemplateFieldPromptId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'GoalTemplateFieldPrompts',
        },
        key: 'id',
      },
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    caution: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hint: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ordinal: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    fieldType: {
      type: DataTypes.ENUM(Object.values(PROMPT_FIELD_TYPE)),
    },
    options: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    validations: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ReportGoalTemplateFieldPrompt',
  });
  return ReportGoalTemplateFieldPrompt;
};
