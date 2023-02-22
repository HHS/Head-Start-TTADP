const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
const { afterCreate, afterDestroy } = require('./hooks/activityReportObjectiveResource');

export default (sequelize, DataTypes) => {
  class ActivityReportObjectiveResource extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ActivityReportObjectiveResource.belongsTo(models.ActivityReportObjective, {
        foreignKey: 'activityReportObjectiveId',
        onDelete: 'cascade',
        as: 'activityReportObjective',
      });
      ActivityReportObjectiveResource.belongsTo(models.Resource, { foreignKey: 'resourceId', as: 'resource' });
    }
  }
  ActivityReportObjectiveResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    activityReportObjectiveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.INTEGER,
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY((DataTypes.ENUM(Object.values(SOURCE_FIELD.REPORTOBJECTIVE)))),
    },
    isAutoDetected: {
      type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
      get() {
        // eslint-disable-next-line global-require
        const { calculateIsAutoDetectedForActivityReportObjective } = require('../services/resource');
        return calculateIsAutoDetectedForActivityReportObjective(this.get('sourceFields'));
      },
    },
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
    modelName: 'ActivityReportObjectiveResource',
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ActivityReportObjectiveResource;
};
