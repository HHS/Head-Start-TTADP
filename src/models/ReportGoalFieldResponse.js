const { Model } = require('sequelize');
const { generateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportGoalFieldResponse extends Model {
    static associate(models) {
      generateJunctionTableAssociations(
        models.ReportGoalFieldResponse,
        [
          models.ReportGoal,
          models.GoalTemplateFieldPrompt,
        ],
        { suffixes: null },
      );
    }
  }
  ReportGoalFieldResponse.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportGoalId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportGoals',
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
    // TODO: link with GoalFieldResponse
    response: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ReportGoalFieldResponse',
  });
  return ReportGoalFieldResponse;
};
