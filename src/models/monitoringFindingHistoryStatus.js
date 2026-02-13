import { Model } from 'sequelize'
import { beforeCreate, beforeUpdate } from './hooks/monitoringFindingHistoryStatus'

export default (sequelize, DataTypes) => {
  class MonitoringFindingHistoryStatus extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringFindingHistoryStatusLink:
       *      MonitoringFindingHistoryStatusLink.statusId >- statusId
       *  status: statusId -< MonitoringFindingHistoryStatusLink.statusId
       */

      models.MonitoringFindingHistoryStatusLink.hasMany(models.MonitoringFindingHistoryStatus, {
        foreignKey: 'statusId',
        as: 'monitoringFindingHistoryStatuses',
      })

      models.MonitoringFindingHistoryStatus.belongsTo(models.MonitoringFindingHistoryStatusLink, {
        foreignKey: 'statusId',
        as: 'statusLink',
      })
    }
  }
  MonitoringFindingHistoryStatus.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      statusId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      sourceCreatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      sourceUpdatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      sourceDeletedAt: {
        allowNull: true,
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: 'MonitoringFindingHistoryStatus',
      tableName: 'MonitoringFindingHistoryStatuses',
      paranoid: true,
      hooks: {
        beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      },
    }
  )
  return MonitoringFindingHistoryStatus
}
