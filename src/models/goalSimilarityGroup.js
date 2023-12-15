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
    goals: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
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
    goalsMerged: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'GoalSimilarityGroup',
  });
  return GoalSimilarityGroup;
};
