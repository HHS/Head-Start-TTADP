const { Model } = require('sequelize');
// const { afterCreate, afterDestroy } = require('./hooks/objectiveResource');

module.exports = (sequelize, DataTypes) => {
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
    }
  }
  ActivityReportObjectiveResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    userProvidedUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    activityReportObjectiveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveResource',
    // hooks: {
    //   afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
    //   afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    // },
  });
  return ActivityReportObjectiveResource;
};
