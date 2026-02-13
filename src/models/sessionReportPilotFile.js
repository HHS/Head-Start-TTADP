const { Model } = require('sequelize')
const { afterDestroy } = require('./hooks/sessionReportPilotFile')

export default (sequelize, DataTypes) => {
  class SessionReportPilotFile extends Model {
    static associate(models) {
      SessionReportPilotFile.belongsTo(models.SessionReportPilot, {
        foreignKey: 'sessionReportPilotId',
        as: 'sessionReport',
      })
      SessionReportPilotFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' })
    }
  }
  SessionReportPilotFile.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      sessionReportPilotId: {
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
      modelName: 'SessionReportPilotFile',
      hooks: {
        afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
      },
    }
  )
  return SessionReportPilotFile
}
