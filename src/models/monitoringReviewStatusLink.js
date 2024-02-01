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
  class MonitoringReviewStatusLink extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringReviews: MonitoringReview.statusId >- statusId
       *  statusLink: statusId -< MonitoringReview.statusId
       *
       *  monitoringReviewStatus: MonitoringReviewStatus.statusId >- statusId
       *  statusLink: statusId -< MonitoringReviewStatus.statusId
       */
    }
  }
  MonitoringReviewStatusLink.init({
    statusId: {
      primaryKey: true,
      allowNull: false,
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'MonitoringReviewStatusLink',
    tableName: 'MonitoringReviewStatusLinks',
    paranoid: true,
  });
  return MonitoringReviewStatusLink;
};
