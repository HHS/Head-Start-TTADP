const { Model } = require('sequelize')
const { SOURCE_FIELD } = require('../constants')
const { afterDestroy } = require('./hooks/goalResource')

export default (sequelize, DataTypes) => {
  class GoalResource extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      GoalResource.belongsTo(models.Goal, { foreignKey: 'goalId', onDelete: 'cascade', as: 'goal' })
      GoalResource.belongsTo(models.Resource, { foreignKey: 'resourceId', as: 'resource' })
    }
  }
  GoalResource.init(
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
      resourceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sourceFields: {
        allowNull: true,
        default: null,
        type: DataTypes.ARRAY(DataTypes.ENUM(Object.values(SOURCE_FIELD.GOAL))),
      },
      isAutoDetected: {
        type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
        get() {
          // eslint-disable-next-line global-require
          const { calculateIsAutoDetectedForGoal } = require('../services/resource')
          return calculateIsAutoDetectedForGoal(this.get('sourceFields'))
        },
      },
      onAR: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      onApprovedAR: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'GoalResource',
      hooks: {
        afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
      },
    }
  )
  return GoalResource
}
