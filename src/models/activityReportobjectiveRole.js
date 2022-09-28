const { Model } = require('sequelize');
// const { afterCreate, afterDestroy } = require('./hooks/objectiveRole');

/**
   * ObjectiveRole table. Junction table
   * between Objectives and roles
   * @param {} sequelize
   * @param {*} DataTypes
   */
module.exports = (sequelize, DataTypes) => {
  class ActivityReportObjectiveRole extends Model {
    static associate(models) {
      ActivityReportObjectiveRole.belongsTo(models.ActivityReportObjective, {
        foreignKey: 'activityReportObjectiveId',
        onDelete: 'cascade',
        as: 'activityReportObjective',
        hooks: true,
      });
      ActivityReportObjectiveRole.belongsTo(models.Role, {
        foreignKey: 'roleId',
        onDelete: 'cascade',
        as: 'role',
        hooks: true,
      });
    }
  }
  ActivityReportObjectiveRole.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportObjectiveId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveRole',
    // hooks: {
    //   afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
    //   afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    // },
  });
  return ActivityReportObjectiveRole;
};
