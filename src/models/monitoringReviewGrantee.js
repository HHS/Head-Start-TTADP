import { Model } from 'sequelize'
import { beforeCreate, beforeUpdate } from './hooks/monitoringReviewGrantee'

export default (sequelize, DataTypes) => {
  class MonitoringReviewGrantee extends Model {
    static associate(models) {
      models.MonitoringReviewLink.hasMany(models.MonitoringReviewGrantee, {
        foreignKey: 'reviewId',
        as: 'monitoringReviewGrantees',
      })

      models.MonitoringReviewGrantee.belongsTo(models.MonitoringReviewLink, {
        foreignKey: 'reviewId',
        as: 'monitoringReviewLink',
      })

      models.GrantNumberLink.hasMany(models.MonitoringReviewGrantee, {
        foreignKey: 'grantNumber',
        as: 'monitoringReviewGrantees',
      })

      models.MonitoringReviewGrantee.belongsTo(models.GrantNumberLink, {
        foreignKey: 'grantNumber',
        as: 'grantNumberLink',
      })

      models.MonitoringGranteeLink.hasMany(models.MonitoringReviewGrantee, {
        foreignKey: 'granteeId',
        as: 'monitoringReviewGrantees',
      })

      models.MonitoringReviewGrantee.belongsTo(models.MonitoringGranteeLink, {
        foreignKey: 'granteeId',
        as: 'monitoringGranteeLink',
      })
    }
  }
  MonitoringReviewGrantee.init(
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
      },
      granteeId: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      createTime: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updateTime: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updateBy: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
      grantNumber: {
        allowNull: false,
        type: DataTypes.TEXT,
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
      modelName: 'MonitoringReviewGrantee',
      tableName: 'MonitoringReviewGrantees',
      paranoid: true,
      hooks: {
        beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      },
    }
  )
  return MonitoringReviewGrantee
}
