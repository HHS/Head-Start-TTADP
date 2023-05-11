const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ReportGoalFieldResponse extends Model {
    static associate(models) {
      ReportGoalFieldResponse.belongsTo(models.ReportGoal, { foreignKey: 'reportGoalId', onDelete: 'cascade', as: 'reportGoal' });
      ReportGoalFieldResponse.belongsTo(models.GoalTemplateFieldPrompt, { foreignKey: 'goalTemplateFieldPromptId', as: 'prompt' });
    }
  }
  ReportGoalFieldResponse.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportGoalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    goalTemplateFieldPromptId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
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
