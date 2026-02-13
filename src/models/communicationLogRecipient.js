const { Model } = require('sequelize')

export default (sequelize, DataTypes) => {
  class CommunicationLogRecipient extends Model {
    static associate(models) {
      CommunicationLogRecipient.belongsTo(models.CommunicationLog, {
        foreignKey: 'communicationLogId',
        as: 'communicationLog',
      })
      CommunicationLogRecipient.belongsTo(models.Recipient, {
        foreignKey: 'recipientId',
        as: 'recipient',
      })
    }
  }
  CommunicationLogRecipient.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      recipientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Recipients',
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
      modelName: 'CommunicationLogRecipient',
    }
  )
  return CommunicationLogRecipient
}
