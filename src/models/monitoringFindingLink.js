import { Model } from 'sequelize'

/**
 * The incoming data does not have traditional primary keys that can be used in
 * Sequelize, and changing the data to fit Sequelize's expectations would complicate
 * synchronization efforts and make it harder to identify and diagnose any errors
 * in the incoming data.
 */

export default (sequelize, DataTypes) => {
  class MonitoringFindingLink extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringFindings: MonitoringFinding.findingId >- findingId
       *  monitoringFindingLink: findingId -< MonitoringFinding.findingId
       *
       *  monitoringFindingGrantees: MonitoringFindingGrantee.findingId >- findingId
       *  monitoringFindingLink: findingId -< MonitoringFindingGrantee.findingId
       *
       *  monitoringFindingHistories: MonitoringFindingHistory.findingId >- findingId
       *  monitoringFindingLink: findingId -< MonitoringFindingHistory.findingId
       *
       *  monitoringClassSummaries: MonitoringClassSummary.findingId >- findingId
       *  monitoringFindingLink: findingId -< MonitoringClassSummary.findingId
       */
    }
  }
  MonitoringFindingLink.init(
    {
      // Note: id column is only here for the audit log
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
      },
      findingId: {
        primaryKey: true,
        allowNull: false,
        type: DataTypes.TEXT,
      },
    },
    {
      sequelize,
      modelName: 'MonitoringFindingLink',
      tableName: 'MonitoringFindingLinks',
      paranoid: true,
    }
  )
  return MonitoringFindingLink
}
