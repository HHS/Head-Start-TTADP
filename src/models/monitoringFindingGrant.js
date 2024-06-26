import { Model } from 'sequelize';
import {
  beforeCreate,
  beforeUpdate,
} from './hooks/monitoringFindingGrant';

export default (sequelize, DataTypes) => {
  class MonitoringFindingGrant extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringFindingLink: MonitoringFindingLink.statusId >- statusId
       *  status: statusId -< MonitoringFindingLink.statusId
       */

      models.MonitoringFindingLink.hasMany(
        models.MonitoringFindingGrant,
        {
          foreignKey: 'findingId',
          as: 'monitoringFindingGrants',
        },
      );

      models.MonitoringFindingGrant.belongsTo(
        models.MonitoringFindingLink,
        {
          foreignKey: 'findingId',
          as: 'findingLink',
        },
      );

      models.MonitoringFindingStatusLink.hasMany(
        models.MonitoringFindingGrant,
        {
          foreignKey: 'statusId',
          as: 'monitoringFindingGrants',
        },
      );

      models.MonitoringFindingGrant.belongsTo(
        models.MonitoringFindingStatusLink,
        {
          foreignKey: 'statusId',
          as: 'statusLink',
        },
      );

      models.MonitoringGranteeLink.hasMany(
        models.MonitoringFindingGrant,
        {
          foreignKey: 'granteeId',
          as: 'monitoringFindingGrants',
        },
      );

      models.MonitoringFindingGrant.belongsTo(
        models.MonitoringGranteeLink,
        {
          foreignKey: 'granteeId',
          as: 'granteeLink',
        },
      );
    }
  }
  MonitoringFindingGrant.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    findingId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    granteeId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    findingType: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    source: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    correctionDeadLine: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reportedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    hash: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sourceCreatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    sourceUpdatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    sourceDeletedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'MonitoringFindingGrant',
    tableName: 'MonitoringFindingGrants',
    paranoid: true,
    hooks: {
      beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
    },
  });
  return MonitoringFindingGrant;
};
