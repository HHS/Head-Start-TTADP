import { Model } from 'sequelize'

/**
 * The incoming data does not have traditional primary keys that can be used in
 * Sequelize, and changing the data to fit Sequelize's expectations would complicate
 * synchronization efforts and make it harder to identify and diagnose any errors
 * in the incoming data.
 */

export default (sequelize, DataTypes) => {
  class MonitoringFindingStatusLink extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringFindingStatuses: MonitoringFindingStatus.statusId >- statusId
       *  monitoringFindingStatusLink: statusId -< MonitoringFindingStatus.statusId
       *
       *  monitoringFindingStatusGrantees: MonitoringFindingStatusGrantee.statusId >- statusId
       *  monitoringFindingStatusLink: statusId -< MonitoringFindingStatusGrantee.statusId
       *
       *  monitoringFindingStatusHistories: MonitoringFindingStatusHistory.statusId >- statusId
       *  monitoringFindingStatusLink: statusId -< MonitoringFindingStatusHistory.statusId
       *
       *  monitoringClassSummaries: MonitoringClassSummary.statusId >- statusId
       *  monitoringFindingStatusLink: statusId -< MonitoringClassSummary.statusId
       */
    }
  }
  MonitoringFindingStatusLink.init(
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
      modelName: 'MonitoringFindingStatusLink',
      tableName: 'MonitoringFindingStatusLinks',
      paranoid: true,
    }
  )
  return MonitoringFindingStatusLink
}
