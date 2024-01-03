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
      models.Goal.belongsToMany(models.GoalSimilarityGroup, {
        through: models.GoalSimilarityGroupGoal,
        foreignKey: 'goalId',
        otherKey: 'goalSimilarityGroupId',
        as: 'similarityGroups',
      });
      models.Recipient.hasMany(models.GoalSimilarityGroup, { foreignKey: 'recipientId', as: 'goalSimilarityGroups' });
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
