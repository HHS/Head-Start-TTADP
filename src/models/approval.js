const { Model } = require('sequelize');
const {
  afterCreate,
  afterDestroy,
  afterRestore,
  afterUpdate,
  afterUpsert,
} = require('./hooks/approval');
const { validateSubmissionStatus } = require('./validation/approval');
const {
  ENTITY_TYPES,
  COLLABORATOR_TYPES,
  APPROVAL_RATIO,
  REPORT_STATUSES,
} = require('../constants');

module.exports = (sequelize, DataTypes) => {
  class Approval extends Model {
    static associate(models) {
      Approval.belongsTo(models.ActivityReport, {
        scope: {
          entityType: ENTITY_TYPES.REPORT,
        },
        foreignKey: 'entityId',
        as: 'report',
      });
      Approval.belongsTo(models.ActivityReportGoal, {
        scope: {
          entityType: ENTITY_TYPES.REPORTGOAL,
        },
        foreignKey: 'entityId',
        as: 'reportGoal',
      });
      Approval.belongsTo(models.ActivityReportObjective, {
        scope: {
          entityType: ENTITY_TYPES.REPORTOBJECTIVE,
        },
        foreignKey: 'entityId',
        as: 'reportObjective',
      });
      Approval.belongsTo(models.Goal, {
        scope: {
          entityType: ENTITY_TYPES.GOAL,
        },
        foreignKey: 'entityId',
        as: 'goal',
      });
      Approval.belongsTo(models.GoalTemplate, {
        scope: {
          entityType: ENTITY_TYPES.GOALTEMPLATE,
        },
        foreignKey: 'entityId',
        as: 'goalTemplate',
      });
      Approval.belongsTo(models.Objective, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVE,
        },
        foreignKey: 'entityId',
        as: 'objective',
      });
      Approval.belongsTo(models.ObjectiveTemplate, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVETEMPLATE,
        },
        foreignKey: 'entityId',
        as: 'objectiveTemplate',
      });
      Approval.hasMany(models.Collaborator, {
        scope: {
          entityType: COLLABORATOR_TYPES.RATIFIER,
        },
        foreignKey: 'entityId',
        as: 'reportApprovers',
      });
    }
  }
  Approval.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    entityType: {
      allowNull: false,
      default: null,
      type: DataTypes.ENUM(Object.keys(ENTITY_TYPES).map((k) => ENTITY_TYPES[k])),
    },
    entityId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    tier: {
      allowNull: true,
      default: null,
      type: DataTypes.INTEGER,
    },
    ratioRequired: {
      allowNull: false,
      type: DataTypes
        .ENUM(Object.keys(APPROVAL_RATIO).map((k) => APPROVAL_RATIO[k])),
      default: APPROVAL_RATIO.ALL,
    },
    submissionStatus: {
      allowNull: false,
      type: DataTypes
        .ENUM(Object.keys(REPORT_STATUSES).map((k) => REPORT_STATUSES[k])),
      validate: validateSubmissionStatus(),
    },
    calculatedStatus: {
      allowNull: true,
      type: DataTypes
        .ENUM(Object.keys(REPORT_STATUSES).map((k) => REPORT_STATUSES[k])),
    },
    firstSubmittedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    submittedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    approvedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    createdAt: {
      allowNull: false,
      defaultValue: DataTypes.fn('NOW'),
      type: DataTypes.DATE,
    },
    updatedAt: {
      allowNull: false,
      defaultValue: DataTypes.fn('NOW'),
      type: DataTypes.DATE,
    },
    deletedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
  }, {
    hooks: {
      afterCreate: async (instance) => afterCreate(sequelize, instance),
      afterDestroy: async (instance) => afterDestroy(sequelize, instance),
      afterRestore: async (instance) => afterRestore(sequelize, instance),
      afterUpdate: async (instance) => afterUpdate(sequelize, instance),
      afterUpsert: async (instance) => afterUpsert(sequelize, instance),
    },
    indexes: [{
      unique: true,
      fields: ['activityReportId', 'userId'],
    }],
    sequelize,
    paranoid: true,
    modelName: 'Approval',
  });
  return Approval;
};
