const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class MonitoringReview extends Model {
    static associate(models) {
      models.MonitoringReviewStatus.hasMany(
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

        models.MonitoringReview,
        {
          foreignKey: 'statusId',
          targetKey: 'statusId',
          as: 'monitoringReviews',
        },
      );

      models.MonitoringReview.belongsTo(
        models.MonitoringReviewStatus,
        {
          foreignKey: 'statusId',
          targetKey: 'statusId',
          as: 'status',
        },
      );
    }
  }
  MonitoringReview.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    reviewId: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contentId: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    statusId: {
      type: DataTypes.INTEGER,
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
  }, {
    sequelize,
    modelName: 'MonitoringReview',
    tableName: 'MonitoringReviews',
    paranoid: true,
  });
  return MonitoringReview;
};
