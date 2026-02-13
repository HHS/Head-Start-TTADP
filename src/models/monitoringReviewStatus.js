import { Model } from 'sequelize'
import { beforeCreate, beforeUpdate } from './hooks/monitoringReviewStatus'

export default (sequelize, DataTypes) => {
  class MonitoringReviewStatus extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringReviewStatusLink: MonitoringReviewStatusLink.statusId >- statusId
       *  status: statusId -< MonitoringReviewStatusLink.statusId
       */

      models.MonitoringReviewStatusLink.hasMany(models.MonitoringReviewStatus, {
        foreignKey: 'statusId',
        as: 'monitoringReviewStatuses',
      })

      models.MonitoringReviewStatus.belongsTo(models.MonitoringReviewStatusLink, {
        foreignKey: 'statusId',
        as: 'statusLink',
      })
    }
  }
  MonitoringReviewStatus.init(
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
      modelName: 'MonitoringReviewStatus',
      tableName: 'MonitoringReviewStatuses',
      paranoid: true,
      hooks: {
        beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      },
    }
  )
  return MonitoringReviewStatus
}
