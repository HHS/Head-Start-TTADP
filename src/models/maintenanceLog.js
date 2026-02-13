const { Model } = require('sequelize')
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../constants')

export default (sequelize, DataTypes) => {
  class MaintenanceLog extends Model {
    static associate(models) {
      MaintenanceLog.belongsTo(models.MaintenanceLog, {
        foreignKey: 'triggeredById',
        as: 'triggeredBy',
      })
      MaintenanceLog.hasMany(models.MaintenanceLog, {
        foreignKey: 'triggeredById',
        as: 'triggered',
      })
    }
  }
  MaintenanceLog.init(
    {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: null,
        comment: null,
        primaryKey: true,
        autoIncrement: true,
      },
      category: {
        allowNull: false,
        type: DataTypes.DataTypes.ENUM(Object.values(MAINTENANCE_CATEGORY)),
      },
      type: {
        allowNull: false,
        type: DataTypes.DataTypes.ENUM(Object.values(MAINTENANCE_TYPE)),
      },
      data: {
        allowNull: false,
        type: DataTypes.JSON,
      },
      isSuccessful: {
        type: DataTypes.BOOLEAN,
      },
      triggeredById: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'MaintenanceLog',
    }
  )
  return MaintenanceLog
}
