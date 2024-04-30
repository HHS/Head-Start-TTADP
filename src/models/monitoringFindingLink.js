import { Model } from 'sequelize';

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

      // Many-to-Many Association between MonitoringFinding and MonitoringFindingGrant through MonitoringFindingLink
      models.MonitoringFinding.belongsToMany(models.MonitoringFindingGrant, {
        through: models.MonitoringFindingLink,
        foreignKey: 'findingId',
        otherKey: 'findingId',
        as: 'findingGrants'
      });

      models.MonitoringFindingGrant.belongsToMany(models.MonitoringFinding, {
        through: models.MonitoringFindingLink,
        foreignKey: 'findingId',
        otherKey: 'findingId',
        as: 'findings'
      });

      // Many-to-Many Association between MonitoringFinding and MonitoringFindingHistory through MonitoringFindingLink
      models.MonitoringFinding.belongsToMany(models.MonitoringFindingHistory, {
        through: models.MonitoringFindingLink,
        foreignKey: 'findingId',
        otherKey: 'findingId',
        as: 'findingHistories'
      });

      models.MonitoringFindingHistory.belongsToMany(models.MonitoringFinding, {
        through: models.MonitoringFindingLink,
        foreignKey: 'findingId',
        otherKey: 'findingId',
        as: 'findings'
      });

      // Many-to-Many Association between MonitoringFinding and MonitoringFindingStandard through MonitoringFindingLink
      models.MonitoringFinding.belongsToMany(models.MonitoringFindingStandard, {
        through: models.MonitoringFindingLink,
        foreignKey: 'findingId',
        otherKey: 'findingId',
        as: 'findingStandards'
      });

      models.MonitoringFindingStandard.belongsToMany(models.MonitoringFinding, {
        through: models.MonitoringFindingLink,
        foreignKey: 'findingId',
        otherKey: 'findingId',
        as: 'findings'
      });

      // Many-to-Many Association between MonitoringFindingGrant and MonitoringFindingStandard through MonitoringFindingLink
      models.MonitoringFindingGrant.belongsToMany(models.MonitoringFindingStandard, {
        through: models.MonitoringFindingLink,
        foreignKey: 'findingId',
        otherKey: 'findingId',
        as: 'findingStandards'
      });

      models.MonitoringFindingStandard.belongsToMany(models.MonitoringFindingGrant, {
        through: models.MonitoringFindingLink,
        foreignKey: 'findingId',
        otherKey: 'findingId',
        as: 'findingGrants'
      });

      // Many-to-Many Association between MonitoringFindingHistory and MonitoringFindingStandard through MonitoringFindingLink
      models.MonitoringFindingHistory.belongsToMany(models.MonitoringFindingStandard, {
        through: models.MonitoringFindingLink,
        foreignKey: 'findingId',
        otherKey: 'findingId',
        as: 'findingStandards'
      });

      models.MonitoringFindingStandard.belongsToMany(models.MonitoringFindingHistory, {
        through: models.MonitoringFindingLink,
        foreignKey: 'findingId',
        otherKey: 'findingId',
        as: 'findingHistories'
      });
    }
  }
  MonitoringFindingLink.init({
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
  }, {
    sequelize,
    modelName: 'MonitoringFindingLink',
    tableName: 'MonitoringFindingLinks',
    paranoid: true,
  });
  return MonitoringFindingLink;
};
