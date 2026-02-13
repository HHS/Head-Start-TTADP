import { Model } from 'sequelize'

/**
 * The incoming data does not have traditional primary keys that can be used in
 * Sequelize, and changing the data to fit Sequelize's expectations would complicate
 * synchronization efforts and make it harder to identify and diagnose any errors
 * in the incoming data.
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
  MonitoringReviewStatusLink.init(
    {
      // Note: id column is only here for the audit log
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
      },
      statusId: {
        primaryKey: true,
        allowNull: false,
        type: DataTypes.INTEGER,
      },
    },
    {
      sequelize,
      modelName: 'MonitoringReviewStatusLink',
      tableName: 'MonitoringReviewStatusLinks',
      paranoid: true,
    }
  )
  return MonitoringReviewStatusLink
}
