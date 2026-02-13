const { Model } = require('sequelize')
const { formatDate } = require('../lib/modelHelpers')

export default (sequelize, DataTypes) => {
  class CollabReportStep extends Model {
    static associate(models) {
      CollabReportStep.belongsTo(models.CollabReport, {
        foreignKey: 'collabReportId',
        as: 'collabReport',
      })
    }
  }

  CollabReportStep.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      collabReportId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'CollabReports',
          key: 'id',
        },
      },
      collabStepDetail: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
      collabStepCompleteDate: {
        allowNull: true,
        type: DataTypes.DATEONLY,
        get: formatDate,
      },
    },
    {
      sequelize,
      modelName: 'CollabReportStep',
      tableName: 'CollabReportSteps',
      timestamps: true,
      paranoid: true,
    }
  )

  return CollabReportStep
}
