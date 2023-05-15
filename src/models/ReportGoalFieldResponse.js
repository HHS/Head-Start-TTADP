const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ReportGoalFieldResponse extends Model {
    static associate(models) {
      ReportGoalFieldResponse.belongsTo(models.ReportGoal, {
        foreignKey: 'reportGoalId',
        onDelete: 'cascade',
        as: 'reportGoal',
      });
      ReportGoalFieldResponse.belongsTo(models.ReportGoalFieldResponse, {
        foreignKey: 'goalTemplateFieldPromptId',
        as: 'prompt',
      });
      models.ReportGoal.hasMany(models.ReportGoal, {
        foreignKey: 'reportGoalId',
        onDelete: 'cascade',
        as: 'reportGoalFieldResponses',
      });
      models.GoalTemplateFieldPrompt.hasMany(models.ReportGoalFieldResponse, {
        foreignKey: 'goalTemplateFieldPromptId',
        as: 'reportGoalFieldResponses',
      });
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
    },
    goalTemplateFieldPromptId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
