const { Op, Model } = require('sequelize');
const { COLLABORATOR_TYPES, ENTITY_TYPES, CLOSE_SUSPEND_REASONS } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
const { beforeValidate, afterCreate, beforeUpdate, afterUpdate } = require('./hooks/goal');

/**
 * Goals table. Stores goals for tta.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Goal extends Model {
    static associate(models) {
      Goal.hasMany(models.ActivityReportGoal, { foreignKey: 'goalId', as: 'activityReportGoals', hooks: true });
      Goal.belongsToMany(models.ActivityReport, {
        through: models.ActivityReportGoal,
        foreignKey: 'goalId',
        otherKey: 'activityReportId',
        as: 'activityReports',
        hooks: true,
      });
      Goal.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant', hooks: true });
      Goal.hasMany(models.Objective, { foreignKey: 'goalId', as: 'objectives', hooks: true });
      Goal.belongsTo(models.GoalTemplate, { foreignKey: 'goalTemplateId', as: +'goalTemplates', hooks: true });
      Goal.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.GOAL,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.RATIFIER] },
        },
        foreignKey: 'entityId',
        as: 'approvers',
        hooks: true,
      });
      Goal.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.GOAL,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.EDITOR] },
        },
        foreignKey: 'entityId',
        as: 'collaborators',
        hooks: true,
      });
      Goal.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.GOAL,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.OWNER] },
        },
        foreignKey: 'entityId',
        as: 'owner',
        hooks: true,
      });
      Goal.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.GOAL,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.INSTANTIATOR] },
        },
        foreignKey: 'entityId',
        as: 'instantiator',
        hooks: true,
      });
      Goal.hasMany(models.Approval, {
        scope: {
          entityType: ENTITY_TYPES.GOAL,
        },
        foreignKey: 'entityId',
        as: 'approvals',
        hooks: true,
      });
    }
  }
  Goal.init({
    name: DataTypes.TEXT,
    status: DataTypes.STRING,
    timeframe: DataTypes.STRING,
    isFromSmartsheetTtaPlan: DataTypes.BOOLEAN,
    endDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    goalNumber: {
      type: DataTypes.VIRTUAL,
      get() {
        const { id } = this;
        return `G-${id}`;
      },
    },
    closeSuspendReason: {
      allowNull: true,
      type: DataTypes.ENUM(Object.keys(CLOSE_SUSPEND_REASONS).map((k) => CLOSE_SUSPEND_REASONS[k])),
    },
    closeSuspendContext: {
      type: DataTypes.TEXT,
    },
    grantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'grants',
        },
        key: 'id',
      },
      onUpdate: 'CASCADE',
    },
    goalTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'goalTemplates',
        },
        key: 'id',
      },
      onUpdate: 'CASCADE',
    },
    previousStatus: {
      type: DataTypes.STRING,
    },
    onApprovedAR: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
    isRttapa: {
      type: DataTypes.ENUM(['Yes', 'No']),
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
    firstCeasedSuspendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastCeasedSuspendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    firstClosedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastClosedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    firstCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdVia: {
      type: DataTypes.ENUM(['imported', 'activityReport', 'rtr']),
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Goal',
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
  });
  return Goal;
};
