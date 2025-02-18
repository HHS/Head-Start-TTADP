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
      models.Goal.hasMany(models.GoalSimilarityGroupGoal, { foreignKey: 'goalId', as: 'goalSimilarityGroupGoals' });

      models.GoalSimilarityGroup.hasMany(models.GoalSimilarityGroupGoal, { foreignKey: 'goalSimilarityGroupId', as: 'goalSimilarityGroups' });
      models.GoalSimilarityGroup.belongsToMany(models.Goal, {
        through: models.GoalSimilarityGroupGoal,
        foreignKey: 'goalSimilarityGroupId',
        otherKey: 'goalId',
        as: 'goals',
      });
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
    excludedIfNotAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'GoalSimilarityGroupGoal',
  });
  return GoalSimilarityGroupGoals;
};
