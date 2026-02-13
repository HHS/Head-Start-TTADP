import { Model } from 'sequelize'
import { beforeCreate, beforeUpdate } from './hooks/monitoringClassSummary'

export default (sequelize, DataTypes) => {
  class MonitoringClassSummary extends Model {
    static associate(models) {
      models.MonitoringReviewLink.hasMany(models.MonitoringClassSummary, {
        foreignKey: 'reviewId',
        as: 'monitoringClassSummaries',
      })

      models.MonitoringClassSummary.belongsTo(models.MonitoringReviewLink, {
        foreignKey: 'reviewId',
        as: 'monitoringReviewLink',
      })

      models.GrantNumberLink.hasMany(models.MonitoringClassSummary, {
        foreignKey: 'grantNumber',
        as: 'monitoringClassSummaries',
      })

      models.MonitoringClassSummary.belongsTo(models.GrantNumberLink, {
        foreignKey: 'grantNumber',
        as: 'grantNumberLink',
      })
    }
  }
  MonitoringClassSummary.init(
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
      grantNumber: {
        type: DataTypes.TEXT,
        allowNull: false,
        references: {
          model: {
            tableName: 'GrantNumberLinks',
          },
          key: 'grantNumber',
        },
      },
      emotionalSupport: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
      },
      classroomOrganization: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
      },
      instructionalSupport: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
      },
      reportDeliveryDate: {
        type: DataTypes.DATE,
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
      modelName: 'MonitoringClassSummary',
      tableName: 'MonitoringClassSummaries',
      paranoid: true,
      hooks: {
        beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      },
    }
  )
  return MonitoringClassSummary
}
