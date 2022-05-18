const { Model } = require('sequelize');
const { afterCreate, afterUpdate, afterUpsert } = require('./hooks/activityReportObjective');

module.exports = (sequelize, DataTypes) => {
  class ActivityReportObjective extends Model {
    static associate(models) {
      ActivityReportObjective.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportObjective.belongsTo(models.Objective, { foreignKey: 'objectiveId', as: 'objective' });
      ActivityReportObjective.hasMany(models.ActivityReportObjectiveFile, { foreignKey: 'activityReportObjectiveId', as: 'activityReportObjectiveFiles' });
      ActivityReportObjective.belongsToMany(models.File, {
        through: models.ActivityReportObjectiveFile,
        // The key in the join table that points to the model defined in this file
        foreignKey: 'activityReportObjectiveId',
        // The key in the join table that points to the "target" of the belongs to many (Users in
        // this case)
        otherKey: 'fileId',
        as: 'files',
      });
    }
  }
  ActivityReportObjective.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportId: {
      type: DataTypes.INTEGER,
    },
    objectiveId: {
      type: DataTypes.INTEGER,
    },
    ttaProvided: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'ActivityReportObjective',
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      afterUpsert: async (instance, options) => afterUpsert(sequelize, instance, options),
    },
  });
  return ActivityReportObjective;
};
