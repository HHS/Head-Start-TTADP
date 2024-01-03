const {
  Model,
} = require('sequelize');

/**
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class GoalSimilarityGroup extends Model {
    static associate(models) {
      GoalSimilarityGroup.belongsTo(models.Recipient, { foreignKey: 'recipientId', as: 'recipient' });
      GoalSimilarityGroup.hasMany(models.GoalSimilarityGroupGoal, { foreignKey: 'goalSimilarityGroupId', as: 'goalSimilarityGroups' });
      GoalSimilarityGroup.belongsToMany(models.Goal, {
        through: models.GoalSimilarityGroupGoal,
        foreignKey: 'goalSimilarityGroupId',
        otherKey: 'goalId',
        as: 'goals',
      });
    }
  }
  GoalSimilarityGroup.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Recipients',
          key: 'id',
        },
      },
    },
    userHasInvalidated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    finalGoalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
  }, {
    sequelize,
    modelName: 'GoalSimilarityGroup',
  });
  return GoalSimilarityGroup;
};
