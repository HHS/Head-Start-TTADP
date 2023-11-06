const {
  Model,
} = require('sequelize');

/**
   * RolesTopic table. Junction table between Roles and Topics to support many to many relationship.
   *
   * @param {} sequelize
   * @param {*} DataTypes
   */
export default (sequelize, DataTypes) => {
  class SimScoreGoalCache extends Model {
    static associate(models) {
      SimScoreGoalCache.belongsTo(models.Goal, { foreignKey: 'goal1', as: 'goalOne' });
      SimScoreGoalCache.belongsTo(models.Goal, { foreignKey: 'goal2', as: 'goalTwo' });
      SimScoreGoalCache.belongsTo(models.Recipient, { foreignKey: 'recipient_id', as: 'recipient' });
    }
  }
  SimScoreGoalCache.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    recipient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Recipients',
          key: 'id',
        },
      },
    },
    goal1: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          key: 'id',
          tableName: 'Goals',
        },
      },
    },
    goal2: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Goals',
          key: 'id',
        },
      },
    },
    score: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'SimScoreGoalCache',
  });
  return SimScoreGoalCache;
};
