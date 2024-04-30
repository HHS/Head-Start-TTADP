import { Model } from 'sequelize';

/**
 * The incoming data does not have traditional primary keys that can be used in
 * Sequelize, and changing the data to fit Sequelize's expectations would complicate
 * synchronization efforts and make it harder to identify and diagnose any errors
 * in the incoming data.
 */

export default (sequelize, DataTypes) => {
  class MonitoringFindingHistoryStatusLink extends Model {
    static associate(models) {
      // Many-to-Many Association between MonitoringFindingHistory and MonitoringFindingHistoryStatus
      // through MonitoringFindingHistoryStatusLink
      models.MonitoringFindingHistory.belongsToMany(models.MonitoringFindingHistoryStatus, {
        through: models.MonitoringFindingHistoryStatusLink,
        foreignKey: 'statusId',
        otherKey: 'statusId',
        as: 'findingHistoryStatuses',
      });

      models.MonitoringFindingHistoryStatus.belongsToMany(models.MonitoringFindingHistory, {
        through: models.MonitoringFindingHistoryStatusLink,
        foreignKey: 'statusId',
        otherKey: 'statusId',
        as: 'findingHistories',
      });
    }
  }
  MonitoringFindingHistoryStatusLink.init({
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
  }, {
    sequelize,
    modelName: 'MonitoringFindingHistoryStatusLink',
    tableName: 'MonitoringFindingHistoryStatusLinks',
    paranoid: true,
  });
  return MonitoringFindingHistoryStatusLink;
};
