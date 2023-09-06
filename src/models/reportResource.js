const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportResource extends Model {
    static associate(models) {
      ReportResource.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportResource.belongsTo(models.Resource, {
        foreignKey: 'resourceId',
        as: 'resource',
      });

      models.Report.hasMany(models.ReportResource, {
        foreignKey: 'reportId',
        as: 'reportResources',
      });
      models.Resource.hasMany(models.ReportResource, {
        foreignKey: 'resourceId',
        as: 'reportResources',
      });
      models.Report.belongsToMany(models.Resource, {
        through: models.ReportResource,
        foreignKey: 'reportId',
        otherKey: 'resourceId',
        as: 'resources',
      });
      models.Resource.belongsToMany(models.Report, {
        through: models.ReportResource,
        foreignKey: 'resourceId',
        otherKey: 'reportId',
        as: 'reports',
      });
    }
  }
  ReportResource.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Resources',
        },
        key: 'id',
      },
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY(DataTypes.ENUM(
        Object.values(SOURCE_FIELD.REPORT),
      )), // TODO: fix source fields
    },
    isAutoDetected: {
      type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
      get() {
        // eslint-disable-next-line global-require
        const { calculateIsAutoDetectedForReport } = require('../services/resource'); // TODO: implement calculateIsAutoDetectedForReport
        return calculateIsAutoDetectedForReport(this.get('sourceFields'));
      },
    },
  }, {
    sequelize,
    modelName: 'ReportResource',
  });
  return ReportResource;
};
