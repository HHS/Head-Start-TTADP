const { Op, Model } = require('sequelize');
const { COLLABORATOR_TYPES, ENTITY_TYPES } = require('../constants');
const { beforeDestroy } = require('./hooks/activityReportObjective');

module.exports = (sequelize, DataTypes) => {
  class ActivityReportObjective extends Model {
    static associate(models) {
      ActivityReportObjective.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport', hooks: true });
      ActivityReportObjective.belongsTo(models.Objective, { foreignKey: 'objectiveId', as: 'objective', hooks: true });
      ActivityReportObjective.hasMany(models.ActivityReportObjectiveFile, { foreignKey: 'activityReportObjectiveId', as: 'activityReportObjectiveFiles', hooks: true });
      ActivityReportObjective.hasMany(models.ActivityReportObjectiveRole, { foreignKey: 'activityReportObjectiveId', as: 'activityReportObjectiveRoles', hooks: true });
      ActivityReportObjective.hasMany(models.ActivityReportObjectiveTopic, { foreignKey: 'activityReportObjectiveId', as: 'activityReportObjectiveTopics', hooks: true });
      ActivityReportObjective.hasMany(models.ActivityReportObjectiveResource, { foreignKey: 'activityReportObjectiveId', as: 'activityReportObjectiveResources', hooks: true });
      ActivityReportObjective.belongsToMany(models.File, {
        through: models.ActivityReportObjectiveFile,
        foreignKey: 'activityReportObjectiveId',
        otherKey: 'fileId',
        as: 'files',
        hooks: true,
      });
      ActivityReportObjective.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORTOBJECTIVE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.RATIFIER] },
        },
        foreignKey: 'entityId',
        as: 'approvers',
        hooks: true,
      });
      ActivityReportObjective.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORTOBJECTIVE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.EDITOR] },
        },
        foreignKey: 'entityId',
        as: 'collaborators',
        hooks: true,
      });
      ActivityReportObjective.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORTOBJECTIVE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.OWNER] },
        },
        foreignKey: 'entityId',
        as: 'owner',
        hooks: true,
      });
      ActivityReportObjective.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORTOBJECTIVE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.INSTANTIATOR] },
        },
        foreignKey: 'entityId',
        as: 'instantiator',
        hooks: true,
      });
      ActivityReportObjective.hasMany(models.Approval, {
        scope: {
          entityType: ENTITY_TYPES.REPORTOBJECTIVE,
        },
        foreignKey: 'entityId',
        as: 'approvals',
        hooks: true,
      });
      ActivityReportObjective.belongsToMany(models.Topic, {
        through: models.ActivityReportObjectiveTopic,
        foreignKey: 'activityReportObjectiveId',
        otherKey: 'topicId',
        as: 'topics',
        hooks: true,
      });
      ActivityReportObjective.belongsToMany(models.Role, {
        through: models.ActivityReportObjectiveRole,
        foreignKey: 'activityReportObjectiveId',
        otherKey: 'roleId',
        as: 'roles',
        hooks: true,
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
    title: DataTypes.TEXT,
    status: DataTypes.STRING,
    ttaProvided: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'ActivityReportObjective',
    hooks: {
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
    },
  });
  return ActivityReportObjective;
};
