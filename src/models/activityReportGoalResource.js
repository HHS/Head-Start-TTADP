const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
// const { afterDestroy } = require('./hooks/activityReportGoalResource');

module.exports = (sequelize, DataTypes) => {
  class ActivityReportGoalResource extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ActivityReportGoalResource.belongsTo(models.ActivityReportGoal, {
        foreignKey: 'activityReportGoalId',
        onDelete: 'cascade',
        as: 'activityReportGoal',
      });
      ActivityReportGoalResource.belongsTo(models.Resource, { foreignKey: 'resourceId', as: 'resource' });
    }
  }
  ActivityReportGoalResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    activityReportGoalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.INTEGER,
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY((DataTypes.ENUM(Object.values(SOURCE_FIELD.REPORTGOAL)))),
    },
    isAutoDetected: {
      type: DataTypes.BOOLEAN,
      default: false,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportGoalResource',
    // hooks: {
    //   afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    // },
  });
  return ActivityReportGoalResource;
};
