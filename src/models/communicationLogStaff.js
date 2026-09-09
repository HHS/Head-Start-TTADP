const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CommunicationLogStaff extends Model {
    static associate(models) {
      models.CommunicationLogStaff.belongsTo(models.CommunicationLog, {
        foreignKey: 'communicationLogId',
        as: 'communicationLog',
      });
      models.CommunicationLog.hasMany(models.CommunicationLogStaff, {
        foreignKey: 'communicationLogId',
        as: 'communicationLogStaff',
      });

      models.CommunicationLogStaff.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      models.User.hasMany(models.CommunicationLogStaff, {
        foreignKey: 'userId',
        as: 'communicationLogStaff',
      });
    }
  }
  CommunicationLogStaff.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
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
      communicationLogId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'CommunicationLogs',
          },
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'CommunicationLogStaff',
      tableName: 'CommunicationLogStaff',
      freezeTableName: true,
    }
  );
  return CommunicationLogStaff;
};
