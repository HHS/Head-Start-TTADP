import { Model } from 'sequelize'
import { beforeCreate, beforeUpdate } from './hooks/monitoringFindingHistory'

export default (sequelize, DataTypes) => {
  class MonitoringFindingHistory extends Model {
    static associate(models) {
      models.MonitoringReviewLink.hasMany(models.MonitoringFindingHistory, {
        foreignKey: 'reviewId',
        as: 'monitoringFindingHistories',
      })

      models.MonitoringFindingHistory.belongsTo(models.MonitoringReviewLink, {
        foreignKey: 'reviewId',
        as: 'monitoringReviewLink',
      })
      models.MonitoringFindingLink.hasMany(models.MonitoringFindingHistory, {
        foreignKey: 'findingId',
        as: 'monitoringFindingHistories',
      })

      models.MonitoringFindingHistory.belongsTo(models.MonitoringFindingLink, {
        foreignKey: 'findingId',
        as: 'monitoringFindingLink',
      })
      models.MonitoringFindingHistoryStatusLink.hasMany(models.MonitoringFindingHistory, {
        foreignKey: 'statusId',
        as: 'monitoringFindingHistories',
      })

      models.MonitoringFindingHistory.belongsTo(models.MonitoringFindingHistoryStatusLink, {
        foreignKey: 'statusId',
        as: 'monitoringFindingStatusLink',
      })
    }
  }
  MonitoringFindingHistory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      reviewId: {
        type: DataTypes.TEXT,
        allowNull: false,
        references: {
          model: {
            tableName: 'MonitoringReviewLinks',
          },
          key: 'reviewId',
        },
      },
      findingHistoryId: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      findingId: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      statusId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      narrative: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ordinal: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      determination: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hash: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      modelName: 'MonitoringFindingHistory',
      tableName: 'MonitoringFindingHistories',
      paranoid: true,
      hooks: {
        beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      },
    }
  )
  return MonitoringFindingHistory
}
