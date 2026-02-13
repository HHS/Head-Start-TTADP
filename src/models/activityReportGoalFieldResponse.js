const { Model } = require('sequelize')
const { afterCreate, afterDestroy } = require('./hooks/activityReportGoalFieldResponse')

export default (sequelize, DataTypes) => {
  class ActivityReportGoalFieldResponse extends Model {
    static associate(models) {
      ActivityReportGoalFieldResponse.belongsTo(models.ActivityReportGoal, {
        foreignKey: 'activityReportGoalId',
        onDelete: 'cascade',
        as: 'activityReportGoal',
      })
      ActivityReportGoalFieldResponse.belongsTo(models.GoalTemplateFieldPrompt, {
        foreignKey: 'goalTemplateFieldPromptId',
        as: 'prompt',
      })
    }
  }
  ActivityReportGoalFieldResponse.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      activityReportGoalId: {
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
    },
    {
      sequelize,
      modelName: 'ActivityReportGoalFieldResponse',
      hooks: {
        afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
        afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
      },
    }
  )
  return ActivityReportGoalFieldResponse
}
