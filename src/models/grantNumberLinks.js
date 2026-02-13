import { Model } from 'sequelize'

/**
 * The incoming data does not have traditional primary keys that can be used in
 * Sequelize, and changing the data to fit Sequelize's expectations would complicate
 * synchronization efforts and make it harder to identify and diagnose any errors
 * in the incoming data.
 */

export default (sequelize, DataTypes) => {
  class GrantNumberLink extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringReviewGrantees: MonitoringReviewGrantee.grantNumber >- grantNumber
       *  grantNumberLink: grantNumber -< MonitoringReviewGrantee.grantNumber
       *
       *  monitoringClassSummaries: MonitoringClassSummary.grantNumber >- grantNumber
       *  grantNumberLink: grantNumber -< MonitoringClassSummary.grantNumber
       */

      models.GrantNumberLink.belongsTo(models.Grant, {
        foreignKey: 'grantId',
        as: 'grant',
      })
      models.Grant.hasOne(models.GrantNumberLink, {
        foreignKey: 'grantId',
        as: 'grantNumberLink',
      })
    }
  }
  GrantNumberLink.init(
    {
      // Note: id column is only here for the audit log
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
      },
      grantNumber: {
        primaryKey: true,
        allowNull: false,
        type: DataTypes.TEXT,
      },
      grantId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'grants',
          },
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'GrantNumberLink',
      tableName: 'GrantNumberLinks',
      paranoid: true,
    }
  )
  return GrantNumberLink
}
