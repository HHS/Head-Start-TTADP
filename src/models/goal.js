const { Model } = require('sequelize');
const { CLOSE_SUSPEND_REASONS, GOAL_SOURCES } = require('@ttahub/common');
const { formatDate } = require('../lib/modelHelpers');
const {
  beforeValidate,
  beforeUpdate,
  afterCreate,
  afterUpdate,
} = require('./hooks/goal');

export const RTTAPA_ENUM = ['Yes', 'No'];

/**
 * Goals table. Stores goals for tta.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Goal extends Model {
    static associate(models) {
      Goal.hasMany(models.ActivityReportGoal, { foreignKey: 'goalId', as: 'activityReportGoals' });
      Goal.belongsToMany(models.ActivityReport, {
        through: models.ActivityReportGoal,
        foreignKey: 'goalId',
        otherKey: 'activityReportId',
        as: 'activityReports',
      });
      Goal.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });
      Goal.hasMany(models.Objective, { foreignKey: 'goalId', as: 'objectives' });
      Goal.belongsTo(models.GoalTemplate, { foreignKey: 'goalTemplateId', as: 'goalTemplate' });
      Goal.belongsToMany(models.GoalTemplateFieldPrompt, {
        through: models.GoalFieldResponse,
        foreignKey: 'goalId',
        otherKey: 'goalTemplateFieldPromptId',
        as: 'prompts',
      });
      Goal.hasMany(models.GoalFieldResponse, { foreignKey: 'goalId', as: 'responses' });
      Goal.hasMany(models.GoalResource, { foreignKey: 'goalId', as: 'goalResources' });
      Goal.belongsToMany(models.Resource, {
        through: models.GoalResource,
        foreignKey: 'goalId',
        otherKey: 'resourceId',
        as: 'resources',
      });
    }
  }
  Goal.init({
    name: DataTypes.TEXT,
    status: DataTypes.STRING,
    timeframe: DataTypes.TEXT,
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
      type: DataTypes.TEXT,
    },
    onAR: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    onApprovedAR: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    isRttapa: {
      type: DataTypes.ENUM(RTTAPA_ENUM),
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
    rtrOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    source: {
      type: DataTypes.ENUM(GOAL_SOURCES),
    },
    isFoiaable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isReferenced: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'Goal',
    paranoid: true,
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
  });
  return Goal;
};
