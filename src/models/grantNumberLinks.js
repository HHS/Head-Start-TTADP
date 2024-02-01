import { Model } from 'sequelize';

/**
 * This table exists only as linking bridge between the Grant table and tables needing
 * to match on grant number. This is due to a limitation in sequelize that requires that
 * associations between tables must be made using a primary key. based on the data structure
 * of the incoming data what was not possible  while maintaining the structure of the
 * incoming data. maintaining the structure of the incoming data simplifies the effort to
 * keep the data in sync.
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

      models.GrantNumberLink.belongsTo(
        models.Grant,
        {
          foreignKey: 'grantId',
          as: 'grant',
        },
      );
      models.Grant.hasOne(
        models.GrantNumberLink,
        {
          foreignKey: 'grantId',
          as: 'grantNumberLink',
        },
      );
    }
  }
  GrantNumberLink.init({
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
      allowNull: false,
      references: {
        model: {
          tableName: 'grants',
        },
        key: 'id',
      },
      onUpdate: 'CASCADE',
    },
  }, {
    sequelize,
    modelName: 'GrantNumberLink',
    tableName: 'GrantNumberLinks',
    paranoid: true,
  });
  return GrantNumberLink;
};
