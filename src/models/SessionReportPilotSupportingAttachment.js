const { Model } = require('sequelize')

export default (sequelize, DataTypes) => {
  class SessionReportPilotSupportingAttachment extends Model {
    static associate(models) {
      SessionReportPilotSupportingAttachment.belongsTo(models.SessionReportPilot, {
        foreignKey: 'sessionReportPilotId',
        as: 'sessionReport',
      })
      SessionReportPilotSupportingAttachment.belongsTo(models.File, {
        foreignKey: 'fileId',
        as: 'file',
      })
    }
  }
  SessionReportPilotSupportingAttachment.init(
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
      modelName: 'SessionReportPilotSupportingAttachment',
    }
  )
  return SessionReportPilotSupportingAttachment
}
