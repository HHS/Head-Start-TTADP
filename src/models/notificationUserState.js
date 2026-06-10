const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class NotificationUserState extends Model {
    static associate(models) {
      NotificationUserState.belongsTo(models.Notification, {
        foreignKey: 'notificationId',
        as: 'notification',
      });
      NotificationUserState.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  NotificationUserState.init(
    {
      notificationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Notifications',
          },
          key: 'id',
        },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Users',
          },
          key: 'id',
        },
      },
      viewedAt: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      archivedAt: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'NotificationUserState',
      timestamps: true,
      paranoid: false,
    }
  );

  return NotificationUserState;
};
