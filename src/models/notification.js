const { Model } = require('sequelize');
const { NOTIFICATION_TYPES } = require('../constants');
const { beforeValidate } = require('./hooks/notification');

export default (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Notification.belongsTo(models.ActivityReport, {
        foreignKey: 'entityId',
        constraints: false,
        as: 'activityReport',
      });
      Notification.hasMany(models.NotificationUserState, {
        foreignKey: 'notificationId',
        as: 'userStates',
      });
    }
  }

  Notification.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'Users',
          },
          key: 'id',
        },
      },
      entityId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM(Object.values(NOTIFICATION_TYPES)),
        allowNull: false,
      },
      link: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      label: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      displayId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      triggeredAt: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      actionable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isGlobal: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.userId === null;
        },
      },
    },
    {
      hooks: {
        beforeValidate,
      },
      sequelize,
      modelName: 'Notification',
      timestamps: true,
      paranoid: false,
    }
  );

  return Notification;
};
