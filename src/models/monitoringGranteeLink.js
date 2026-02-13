import { Model } from 'sequelize'

/**
 * The incoming data does not have traditional primary keys that can be used in
 * Sequelize, and changing the data to fit Sequelize's expectations would complicate
 * synchronization efforts and make it harder to identify and diagnose any errors
 * in the incoming data.
 */

export default (sequelize, DataTypes) => {
  class MonitoringGranteeLink extends Model {
    static associate(models) {}
  }
  MonitoringGranteeLink.init(
    {
      // Note: id column is only here for the audit log
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
      },
      granteeId: {
        primaryKey: true,
        allowNull: false,
        type: DataTypes.TEXT,
      },
    },
    {
      sequelize,
      modelName: 'MonitoringGranteeLink',
      tableName: 'MonitoringGranteeLinks',
      paranoid: true,
    }
  )
  return MonitoringGranteeLink
}
