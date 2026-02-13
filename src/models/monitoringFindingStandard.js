import { Model } from 'sequelize'
import { beforeCreate, beforeUpdate } from './hooks/monitoringFindingStandard'

export default (sequelize, DataTypes) => {
  class MonitoringFindingStandard extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringStandardLink: MonitoringStandardLink.standardId >- standardId
       *  status: standardId -< MonitoringStandardLink.standardId
       *  monitoringStandardLink: MonitoringStandardLink.standardId >- standardId
       *  status: standardId -< MonitoringStandardLink.standardId
       */

      models.MonitoringStandardLink.hasMany(models.MonitoringFindingStandard, {
        foreignKey: 'standardId',
        as: 'monitoringFindingStandards',
      })

      models.MonitoringFindingStandard.belongsTo(models.MonitoringStandardLink, {
        foreignKey: 'standardId',
        as: 'standardLink',
      })

      models.MonitoringFindingLink.hasMany(models.MonitoringFindingStandard, {
        foreignKey: 'findingId',
        as: 'monitoringFindingStandards',
      })

      models.MonitoringFindingStandard.belongsTo(models.MonitoringFindingLink, {
        foreignKey: 'findingId',
        as: 'findingLink',
      })
    }
  }
  MonitoringFindingStandard.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      findingId: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      standardId: {
        type: DataTypes.INTEGER,
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
      modelName: 'MonitoringFindingStandard',
      tableName: 'MonitoringFindingStandards',
      paranoid: true,
      hooks: {
        beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      },
    }
  )
  return MonitoringFindingStandard
}
