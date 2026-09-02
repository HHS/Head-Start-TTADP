const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CommunicationLogStaff extends Model {
    static associate(models) {
      CommunicationLogStaff.belongsTo(models.CommunicationLog, {
        foreignKey: 'communicationLogId',
        as: 'communicationLog',
      });
      CommunicationLogStaff.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
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
