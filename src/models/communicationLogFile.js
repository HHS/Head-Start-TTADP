const { Model } = require('sequelize')
const { afterDestroy } = require('./hooks/communicationLogFile')

export default (sequelize, DataTypes) => {
  class CommunicationLogFile extends Model {
    static associate(models) {
      CommunicationLogFile.belongsTo(models.CommunicationLog, {
        foreignKey: 'communicationLogId',
        as: 'communicationLog',
      })
      CommunicationLogFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' })
    }
  }
  CommunicationLogFile.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      communicationLogId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fileId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'CommunicationLogFile',
      hooks: {
        afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
      },
    }
  )
  return CommunicationLogFile
}
