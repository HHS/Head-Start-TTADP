import { Model } from 'sequelize';

/**
 * This table exists only as linking bridge between the tables needing
 * to match on reviewId. This is due to a limitation in sequelize that requires that
 * associations between tables must be made using a primary key. based on the data structure
 * of the incoming data what was not possible while maintaining the structure of the
 * incoming data. Maintaining the structure of the incoming data simplifies the effort to
 * keep the data in sync.
 */

export default (sequelize, DataTypes) => {
  class MonitoringReviewLink extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringReviews: MonitoringReview.reviewId >- reviewId
       *  monitoringReviewLink: reviewId -< MonitoringReview.reviewId
       *
       *  monitoringReviewGrantees: MonitoringReviewGrantee.reviewId >- reviewId
       *  monitoringReviewLink: reviewId -< MonitoringReviewGrantee.reviewId
       *
       *  monitoringFindingHistories: MonitoringFindingHistory.reviewId >- reviewId
       *  monitoringReviewLink: reviewId -< MonitoringFindingHistory.reviewId
       *
       *  monitoringClassSummaries: MonitoringClassSummary.reviewId >- reviewId
       *  monitoringReviewLink: reviewId -< MonitoringClassSummary.reviewId
       */
    }
  }
  MonitoringReviewLink.init({
    reviewId: {
      primaryKey: true,
      allowNull: false,
      type: DataTypes.TEXT,
    },
  }, {
    sequelize,
    modelName: 'MonitoringReviewLink',
    tableName: 'MonitoringReviewLinks',
    paranoid: true,
  });
  return MonitoringReviewLink;
};
