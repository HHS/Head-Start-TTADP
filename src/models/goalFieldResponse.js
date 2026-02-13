const { Model } = require('sequelize')
const { beforeValidate, afterUpdate, afterCreate } = require('./hooks/goalFieldResponse')

export default (sequelize, DataTypes) => {
  class GoalFieldResponse extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      GoalFieldResponse.belongsTo(models.Goal, {
        foreignKey: 'goalId',
        onDelete: 'cascade',
        as: 'goal',
      })
      GoalFieldResponse.belongsTo(models.GoalTemplateFieldPrompt, {
        foreignKey: 'goalTemplateFieldPromptId',
        as: 'prompt',
      })
    }
  }
  GoalFieldResponse.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      goalId: {
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
      onAR: {
        type: DataTypes.BOOLEAN,
        default: false,
        allowNull: false,
      },
      onApprovedAR: {
        type: DataTypes.BOOLEAN,
        default: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'GoalFieldResponse',
      hooks: {
        beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
        afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
        afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      },
    }
  )
  return GoalFieldResponse
}
