import { Model } from 'sequelize'
import { beforeCreate, beforeUpdate } from './hooks/monitoringFindingStatus'

export default (sequelize, DataTypes) => {
  class MonitoringFindingStatus extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringFindingStatusLink: MonitoringFindingStatusLink.statusId >- statusId
       *  status: statusId -< MonitoringFindingStatusLink.statusId
       */

      models.MonitoringFindingStatusLink.hasMany(models.MonitoringFindingStatus, {
        foreignKey: 'statusId',
        as: 'monitoringFindingStatuses',
      })

      models.MonitoringFindingStatus.belongsTo(models.MonitoringFindingStatusLink, {
        foreignKey: 'statusId',
        as: 'statusLink',
      })
    }
  }
  MonitoringFindingStatus.init(
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
      modelName: 'MonitoringFindingStatus',
      tableName: 'MonitoringFindingStatuses',
      paranoid: true,
      hooks: {
        beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      },
    }
  )
  return MonitoringFindingStatus
}
