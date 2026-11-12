const { Model } = require('sequelize');
const { APPROVER_STATUSES } = require('@ttahub/common');

/**
 * The reviewer a TTA request was submitted to, and where they stand. A null status is pending.
 * The request's own status is set by the service, not here. The approving COR the reviewer
 * sends it on to is a TtaRequestApprover.
 */
export default (sequelize, DataTypes) => {
  class TtaRequestReviewer extends Model {
    static associate(models) {
      TtaRequestReviewer.belongsTo(models.TtaRequest, {
        foreignKey: 'ttaRequestId',
        onDelete: 'cascade',
        as: 'ttaRequest',
      });
      TtaRequestReviewer.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  TtaRequestReviewer.init(
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
      status: {
        allowNull: true,
        type: DataTypes.ENUM(Object.values(APPROVER_STATUSES)),
      },
    },
    {
      sequelize,
      modelName: 'TtaRequestReviewer',
      tableName: 'TtaRequestReviewers',
      paranoid: true,
      timestamps: true,
      indexes: [
        {
          name: 'tta_request_reviewers_tta_request_id_user_id',
          unique: true,
          fields: ['ttaRequestId', 'userId'],
        },
      ],
    }
  );

  return TtaRequestReviewer;
};
