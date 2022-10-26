const { Op, Model } = require('sequelize');
const { COLLABORATOR_TYPES, ENTITY_TYPES } = require('../constants');
const { beforeValidate, afterUpdate, afterCreate } = require('./hooks/objective');

/**
 * Objective table. Stores objectives for goals.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class Objective extends Model {
    static associate(models) {
      Objective.belongsToMany(models.ActivityReport, {
        through: models.ActivityReportObjective,
        foreignKey: 'objectiveId',
        otherKey: 'activityReportId',
        as: 'activityReports',
        hooks: true,
      });
      Objective.hasMany(models.ActivityReportObjective, {
        foreignKey: 'objectiveId', as: 'activityReportObjectives', hooks: true,
      });
      Objective.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.RATIFIER] },
        },
        foreignKey: 'entityId',
        as: 'approvers',
        hooks: true,
      });
      Objective.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.EDITOR] },
        },
        foreignKey: 'entityId',
        as: 'collaborators',
        hooks: true,
      });
      Objective.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.OWNER] },
        },
        foreignKey: 'entityId',
        as: 'owner',
        hooks: true,
      });
      Objective.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.INSTANTIATOR] },
        },
        foreignKey: 'entityId',
        as: 'instantiator',
        hooks: true,
      });
      Objective.hasMany(models.Approval, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVE,
        },
        foreignKey: 'entityId',
        as: 'approvals',
        hooks: true,
      });
      Objective.belongsTo(models.OtherEntity, { foreignKey: 'otherEntityId', as: 'otherEntity', hooks: true });
      Objective.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' });
      Objective.hasMany(models.ObjectiveResource, { foreignKey: 'objectiveId', as: 'resources', hooks: true });
      Objective.belongsToMany(models.Topic, {
        through: models.ObjectiveTopic,
        foreignKey: 'objectiveId',
        otherKey: 'topicId',
        as: 'topics',
        hooks: true,
      });
      Objective.belongsTo(models.ObjectiveTemplate, {
        foreignKey: 'objectiveTemplateId',
        as: 'objectiveTemplate',
        onDelete: 'cascade',
        hooks: true,
      });
      Objective.hasMany(models.ObjectiveFile, { foreignKey: 'objectiveId', as: 'objectiveFiles', hooks: true });
      Objective.belongsToMany(models.File, {
        through: models.ObjectiveFile,
        foreignKey: 'objectiveId',
        otherKey: 'fileId',
        as: 'files',
        hooks: true,
      });
    }
  }
  Objective.init({
    otherEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: DataTypes.TEXT,
    status: DataTypes.STRING,
    objectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'objectiveTemplates',
        },
        key: 'id',
      },
      onUpdate: 'CASCADE',
    },
    onApprovedAR: {
      type: DataTypes.BOOLEAN,
    },
    firstNotStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastNotStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    firstInProgressAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastInProgressAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    firstSuspendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastSuspendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    firstCompleteAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastCompleteAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Objective',
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
  });
  return Objective;
};
