const { Model } = require('sequelize');

/** a staff member the reviewer assigned to a TTA request */
export default (sequelize, DataTypes) => {
  class TtaRequestAssignedStaff extends Model {
    static associate(models) {
      TtaRequestAssignedStaff.belongsTo(models.TtaRequest, {
        foreignKey: 'ttaRequestId',
        onDelete: 'cascade',
        as: 'ttaRequest',
      });
      TtaRequestAssignedStaff.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  TtaRequestAssignedStaff.init(
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
    },
    {
      sequelize,
      modelName: 'TtaRequestAssignedStaff',
      tableName: 'TtaRequestAssignedStaff',
      timestamps: true,
      indexes: [
        {
          name: 'tta_request_assigned_staff_tta_request_id_user_id',
          unique: true,
          fields: ['ttaRequestId', 'userId'],
        },
      ],
    }
  );

  return TtaRequestAssignedStaff;
};
