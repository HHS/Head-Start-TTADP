import { Model } from 'sequelize'

/**
 * The incoming data does not have traditional primary keys that can be used in
 * Sequelize, and changing the data to fit Sequelize's expectations would complicate
 * synchronization efforts and make it harder to identify and diagnose any errors
 * in the incoming data.
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
  MonitoringReviewLink.init(
    {
      // Note: id column is only here for the audit log
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
      },
      reviewId: {
        primaryKey: true,
        allowNull: false,
        type: DataTypes.TEXT,
      },
    },
    {
      sequelize,
      modelName: 'MonitoringReviewLink',
      tableName: 'MonitoringReviewLinks',
      paranoid: true,
    }
  )
  return MonitoringReviewLink
}
