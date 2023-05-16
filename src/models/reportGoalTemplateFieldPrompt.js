const { Model } = require('sequelize');
const { PROMPT_FIELD_TYPE } = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportGoalTemplateFieldPrompt extends Model {
    static associate(models) {
      ReportGoalTemplateFieldPrompt.belongsTo(models.ReportGoalTemplate, {
        foreignKey: 'reportGoalTemplateId',
        onDelete: 'cascade',
        as: 'reportGoalTemplate',
      });

      ReportGoalTemplateFieldPrompt.belongsTo(models.GoalTemplateFieldPrompt, {
        foreignKey: 'goalTemplateFieldPromptId',
        onDelete: 'cascade',
        as: 'goalTemplateFieldPrompt',
      });

      models.ReportGoalTemplate.hasMany(models.ReportGoalTemplateFieldPrompt, {
        foreignKey: 'reportGoalTemplateId',
        onDelete: 'cascade',
        as: 'reportGoalTemplateFieldPrompts',
      });

      models.GoalTemplateFieldPrompt.hasMany(models.ReportGoalTemplateFieldPrompt, {
        foreignKey: 'goalTemplateFieldPromptId',
        onDelete: 'cascade',
        as: 'reportGoalTemplateFieldPrompts',
      });

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
    },
    goalTemplateFieldPromptId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
