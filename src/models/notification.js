const { Model } = require('sequelize');
const { NOTIFICATION_TYPES } = require('../constants');

export default (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
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
      archivedAt: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      triggeredAt: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      viewedAt: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      isGlobal: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.userId === null;
        },
      },
      isInformational: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.triggeredAt === null;
        },
      },
    },
    {
      sequelize,
      modelName: 'Notification',
      timestamps: true,
      paranoid: false,
    }
  );

  return Notification;
};
