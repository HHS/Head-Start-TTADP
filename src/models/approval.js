const { Model } = require('sequelize');
const {
  beforeCreate,
  beforeUpdate,
  afterUpdate,
} = require('./hooks/approval');
// const { validateSubmissionStatus } = require('./validation/approval');
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
        hooks: true,
      });
      Approval.belongsTo(models.ActivityReportGoal, {
        scope: {
          entityType: ENTITY_TYPES.REPORTGOAL,
        },
        foreignKey: 'entityId',
        as: 'reportGoal',
        hooks: true,
      });
      Approval.belongsTo(models.ActivityReportObjective, {
        scope: {
          entityType: ENTITY_TYPES.REPORTOBJECTIVE,
        },
        foreignKey: 'entityId',
        as: 'reportObjective',
        hooks: true,
      });
      Approval.belongsTo(models.Goal, {
        scope: {
          entityType: ENTITY_TYPES.GOAL,
        },
        foreignKey: 'entityId',
        as: 'goal',
        hooks: true,
      });
      Approval.belongsTo(models.GoalTemplate, {
        scope: {
          entityType: ENTITY_TYPES.GOALTEMPLATE,
        },
        foreignKey: 'entityId',
        as: 'goalTemplate',
        hooks: true,
      });
      Approval.belongsTo(models.Objective, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVE,
        },
        foreignKey: 'entityId',
        as: 'objective',
        hooks: true,
      });
      Approval.belongsTo(models.ObjectiveTemplate, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVETEMPLATE,
        },
        foreignKey: 'entityId',
        as: 'objectiveTemplate',
        hooks: true,
      });
      Approval.hasMany(models.Collaborator, {
        scope: {
          where: {
            entityType: COLLABORATOR_TYPES.RATIFIER,
          },
        },
        foreignKey: 'entityId',
        as: 'reportApprovers',
        hooks: true,
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
      // validate: {
      //   runValidators() { validateSubmissionStatus(this); },
      // },
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
    isApproved: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.calculatedStatus === REPORT_STATUSES.APPROVED;
      },
    },
  }, {
    hooks: {
      beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
    // indexes: [{
    //   unique: true,
    //   fields: ['activityReportId', 'userId'],
    // }],
    sequelize,
    paranoid: false,
    modelName: 'Approval',
  });
  return Approval;
};
