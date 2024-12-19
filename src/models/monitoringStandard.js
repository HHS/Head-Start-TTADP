import { Model } from 'sequelize';
import {
  beforeCreate,
  beforeUpdate,
} from './hooks/monitoringStandard';

export default (sequelize, DataTypes) => {
  class MonitoringStandard extends Model {
    static associate(models) {
      /**
       * Associations:
       *  monitoringStandardLink: MonitoringStandardLink.standardId >- standardId
       *  status: standardId -< MonitoringStandardLink.standardId
       */

      models.MonitoringStandardLink.hasMany(
        models.MonitoringStandard,
        {
          foreignKey: 'standardId',
          as: 'monitoringStandards',
        },
      );

      models.MonitoringStandard.belongsTo(
        models.MonitoringStandardLink,
        {
          foreignKey: 'standardId',
          as: 'standardLink',
        },
      );
    }
  }
  MonitoringStandard.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    standardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    contentId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    citation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    guidance: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    citable: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    modelName: 'MonitoringStandard',
    tableName: 'MonitoringStandards',
    paranoid: true,
    hooks: {
      beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
    },
  });
  return MonitoringStandard;
};
