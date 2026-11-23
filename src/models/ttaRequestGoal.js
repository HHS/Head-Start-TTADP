const { Model } = require('sequelize');

/**
 * a goal created from a TTA request, or reused for it, when the request's COR approved it;
 * there is one per grant on the request
 */
export default (sequelize, DataTypes) => {
  class TtaRequestGoal extends Model {
    static associate(models) {
      TtaRequestGoal.belongsTo(models.TtaRequest, {
        foreignKey: 'ttaRequestId',
        onDelete: 'cascade',
        as: 'ttaRequest',
      });
      TtaRequestGoal.belongsTo(models.Goal, {
        foreignKey: 'goalId',
        as: 'goal',
      });
    }
  }

  TtaRequestGoal.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      ttaRequestId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'TtaRequests',
          key: 'id',
        },
      },
      goalId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'Goals',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'TtaRequestGoal',
      tableName: 'TtaRequestGoals',
      timestamps: true,
      indexes: [
        {
          name: 'tta_request_goals_tta_request_id_goal_id',
          unique: true,
          fields: ['ttaRequestId', 'goalId'],
        },
        {
          name: 'tta_request_goals_goal_id',
          fields: ['goalId'],
        },
      ],
    }
  );

  return TtaRequestGoal;
};
