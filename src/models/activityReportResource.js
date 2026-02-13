const { Model } = require('sequelize')
const { SOURCE_FIELD } = require('../constants')
const { afterDestroy } = require('./hooks/activityReportResource')

export default (sequelize, DataTypes) => {
  class ActivityReportResource extends Model {
    static associate(models) {
      ActivityReportResource.belongsTo(models.ActivityReport, {
        foreignKey: 'activityReportId',
        as: 'activityReport',
      })
      ActivityReportResource.belongsTo(models.Resource, {
        foreignKey: 'resourceId',
        as: 'resource',
      })
    }
  }
  ActivityReportResource.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      activityReportId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      resourceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sourceFields: {
        allowNull: true,
        default: null,
        type: DataTypes.ARRAY(DataTypes.ENUM(Object.values(SOURCE_FIELD.REPORT))),
      },
      isAutoDetected: {
        type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
        get() {
          // eslint-disable-next-line global-require
          const { calculateIsAutoDetectedForActivityReport } = require('../services/resource')
          return calculateIsAutoDetectedForActivityReport(this.get('sourceFields'))
        },
      },
    },
    {
      sequelize,
      modelName: 'ActivityReportResource',
      hooks: {
        afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
      },
    }
  )
  return ActivityReportResource
}
