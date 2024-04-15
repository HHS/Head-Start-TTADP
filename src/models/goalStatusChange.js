import { afterCreate } from './hooks/goalStatusChange';

const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class GoalStatusChange extends Model {
    static associate(models) {
      GoalStatusChange.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' });
      GoalStatusChange.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });

      models.Goal.hasMany(GoalStatusChange, { foreignKey: 'goalId', as: 'statusChanges' });
      models.User.hasMany(GoalStatusChange, { foreignKey: 'userId', as: 'goalStatusChanges' });
    }
  }

  GoalStatusChange.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'goals',
        },
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'users',
        },
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userRoles: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    oldStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    newStatus: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    context: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'GoalStatusChange',
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
    },
  });

  return GoalStatusChange;
};
