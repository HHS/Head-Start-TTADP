import { Model } from 'sequelize'
import { beforeCreate, beforeUpdate } from './hooks/monitoringReview'

export default (sequelize, DataTypes) => {
  class MonitoringReview extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringReviewGrantees: MonitoringReviewGrantee.reviewId >- reviewId
       *  monitoringReview: reviewId -< MonitoringReviewGrantee.reviewId
       *
       *  monitoringFindingHistories: MonitoringFindingHistory.reviewId >- reviewId
       *  monitoringReview: reviewId -< MonitoringFindingHistory.reviewId
       *
       *  monitoringClassSummaries: MonitoringClassSummary.reviewId >- reviewId
       *  monitoringReview: reviewId -< MonitoringClassSummary.reviewId
       */

      models.MonitoringReviewLink.hasMany(models.MonitoringReview, {
        foreignKey: 'reviewId',
        as: 'monitoringReviews',
      })

      models.MonitoringReview.belongsTo(models.MonitoringReviewLink, {
        foreignKey: 'reviewId',
        as: 'monitoringReviewLink',
      })

      models.MonitoringReviewStatusLink.hasMany(models.MonitoringReview, {
        foreignKey: 'statusId',
        sourceKey: 'statusId',
        as: 'monitoringReviews',
      })

      models.MonitoringReview.belongsTo(models.MonitoringReviewStatusLink, {
        foreignKey: 'statusId',
        sourceKey: 'statusId',
        as: 'statusLink',
      })
    }
  }
  MonitoringReview.init(
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
      contentId: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      statusId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      reviewType: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reportDeliveryDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reportAttachmentId: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      outcome: {
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
      modelName: 'MonitoringReview',
      tableName: 'MonitoringReviews',
      paranoid: true,
      hooks: {
        beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      },
    }
  )
  return MonitoringReview
}
