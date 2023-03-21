const { Op, Model } = require('sequelize');
const { COLLABORATOR_TYPES } = require('../constants');
const {
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
} = require('./hooks/objective');

/**
 * Objective table. Stores objectives for goals.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
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
        foreignKey: 'objectiveId',
        as: 'activityReportObjectives',
        hooks: true,
      });
      Objective.belongsTo(models.OtherEntity, { foreignKey: 'otherEntityId', as: 'otherEntity', hooks: true });
      Objective.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' });
      Objective.hasMany(models.ObjectiveResource, { foreignKey: 'objectiveId', as: 'objectiveResources', hooks: true });
      Objective.belongsToMany(models.Resource, {
        through: models.ObjectiveResource,
        foreignKey: 'objectiveId',
        otherKey: 'resourceId',
        as: 'resources',
      });
      Objective.hasMany(models.ObjectiveTopic, { foreignKey: 'objectiveId', as: 'objectiveTopics', hooks: true });
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
    onAR: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
    onApprovedAR: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
    createdVia: {
      type: DataTypes.ENUM(['activityReport', 'rtr']),
      allowNull: true,
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
    rtrOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Objective',
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
  });
  return Objective;
};
