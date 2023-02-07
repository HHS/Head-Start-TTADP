const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
// const { beforeDestroy, afterDestroy } = require('./hooks/activityReportResource');
const { calculateIsAutoDetectedForActivityReport } = require('../services/resource');

export default (sequelize, DataTypes) => {
  class ActivityReportResource extends Model {
    static associate(models) {
      ActivityReportResource.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportResource.belongsTo(models.Resource, { foreignKey: 'resourceId', as: 'resource' });
    }
  }
  ActivityReportResource.init({
    activityReportId: {
      type: DataTypes.INTEGER,
    },
    resourceId: {
      type: DataTypes.INTEGER,
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY(DataTypes.ENUM(Object.values(SOURCE_FIELD.REPORT))),
    },
    isAutoDetected: {
      type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
      get() {
        return calculateIsAutoDetectedForActivityReport(this.get('sourceFields'));
      },
    },
  }, {
    sequelize,
    modelName: 'ActivityReportResource',
    // hooks: {
    //   beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
    //   afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    // },
  });
  return ActivityReportResource;
};
