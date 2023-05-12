const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportObjectiveResource extends Model {
    static associate(models) {
      ReportObjectiveResource.belongsTo(models.ReportObjective, {
        foreignKey: 'reportObjectiveId',
        onDelete: 'cascade',
        as: 'reportObjective',
      });
      ReportObjectiveResource.belongsTo(models.Resource, {
        foreignKey: 'resourceId',
        as: 'resource',
      });

      models.ReportObjective.hasMany(models.ReportObjectiveResource, {
        foreignKey: 'reportObjectiveId',
        as: 'reportObjectiveResources',
      });
      models.ReportObjective.belongsToMany(models.Resource, {
        through: models.ReportObjectiveResource,
        foreignKey: 'reportObjectiveId',
        otherKey: 'resourceId',
        as: 'resources',
      });

      models.Resource.hasMany(models.ReportObjectiveResource, {
        foreignKey: 'resourceId',
        as: 'reportObjectiveResources',
      });
      models.Resource.belongsToMany(models.ReportObjective, {
        through: models.ReportObjectiveResource,
        foreignKey: 'resourceId',
        otherKey: 'reportObjectiveId',
        as: 'reportObjectives',
      });
    }
  }
  ReportObjectiveResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportObjectiveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.INTEGER,
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY((DataTypes.ENUM(
        Object.values(SOURCE_FIELD.REPORTOBJECTIVE), // TODO: fix enum
      ))),
    },
    // isAutoDetected: {
    //   type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
    //   get() {
    //     // eslint-disable-next-line global-require
    //     const { calculateIsAutoDetectedForActivityReportObjective } = require('../services/resource');
    //     return calculateIsAutoDetectedForActivityReportObjective(this.get('sourceFields'));
    //   },
    // },
    userProvidedUrl: {
      type: new DataTypes.VIRTUAL(DataTypes.TEXT),
      get() {
        return this.resource && this.resource.url
          ? this.resource.url
          : '';
      },
    },
  }, {
    sequelize,
    modelName: 'ReportObjectiveResource',
  });
  return ReportObjectiveResource;
};
