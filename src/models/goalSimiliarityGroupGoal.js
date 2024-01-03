const {
  Model,
} = require('sequelize');

/**
   *
   * @param {} sequelize
   * @param {*} DataTypes
   */
export default (sequelize, DataTypes) => {
  class GoalSimilarityGroupGoals extends Model {
    static associate(models) {
      GoalSimilarityGroupGoals.belongsTo(models.GoalSimilarityGroup, { foreignKey: 'goalSimilarityGroupId', as: 'goalSimilarityGroup' });
      GoalSimilarityGroupGoals.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' });
    }
  }
  GoalSimilarityGroupGoals.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Goals',
          key: 'id',
        },
      },
    },
    goalSimilarityGroupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'GoalSimilarityGroups',
          key: 'id',
        },
      },
    },
  }, {
    sequelize,
    modelName: 'GoalSimilarityGroupGoal',
  });
  return GoalSimilarityGroupGoals;
};
