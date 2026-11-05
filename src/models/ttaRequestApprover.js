const { Model } = require('sequelize');
const { APPROVER_STATUSES } = require('@ttahub/common');

/**
 * Who is on a step of a TTA request - its reviewer, or later its approver - and where they
 * stand. A null status is pending. The request's own status is set by the service, not here.
 */
export default (sequelize, DataTypes) => {
  class TtaRequestApprover extends Model {
    static associate(models) {
      TtaRequestApprover.belongsTo(models.TtaRequest, {
        foreignKey: 'ttaRequestId',
        onDelete: 'cascade',
        as: 'ttaRequest',
      });
      TtaRequestApprover.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  TtaRequestApprover.init(
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
      userId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      step: {
        allowNull: false,
        type: DataTypes.ENUM(['reviewer', 'approver']),
      },
      status: {
        allowNull: true,
        type: DataTypes.ENUM(Object.values(APPROVER_STATUSES)),
      },
    },
    {
      sequelize,
      modelName: 'TtaRequestApprover',
      tableName: 'TtaRequestApprovers',
      paranoid: true,
      timestamps: true,
      indexes: [
        {
          name: 'tta_request_approvers_tta_request_id_user_id_step',
          unique: true,
          fields: ['ttaRequestId', 'userId', 'step'],
        },
      ],
    }
  );

  return TtaRequestApprover;
};
