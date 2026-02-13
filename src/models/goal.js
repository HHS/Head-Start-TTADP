const { Model } = require('sequelize')
const { GOAL_SOURCES } = require('@ttahub/common')
const { formatDate } = require('../lib/modelHelpers')
const { beforeValidate, beforeUpdate, afterCreate, afterUpdate, afterDestroy, beforeCreate } = require('./hooks/goal')
const { GOAL_CREATED_VIA, CREATION_METHOD } = require('../constants')

export const RTTAPA_ENUM = ['Yes', 'No']

/**
 * Goals table. Stores goals for tta.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Goal extends Model {
    static associate(models) {
      Goal.hasMany(models.ActivityReportGoal, { foreignKey: 'goalId', as: 'activityReportGoals' })
      Goal.hasMany(models.ActivityReportGoal, {
        foreignKey: 'originalGoalId',
        as: 'reassignedActivityReportGoals',
      })
      Goal.belongsToMany(models.ActivityReport, {
        through: models.ActivityReportGoal,
        foreignKey: 'goalId',
        otherKey: 'activityReportId',
        as: 'activityReports',
      })
      Goal.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' })
      Goal.hasMany(models.Objective, { foreignKey: 'goalId', as: 'objectives' })
      Goal.belongsTo(models.GoalTemplate, { foreignKey: 'goalTemplateId', as: 'goalTemplate' })
      Goal.belongsToMany(models.GoalTemplateFieldPrompt, {
        through: models.GoalFieldResponse,
        foreignKey: 'goalId',
        otherKey: 'goalTemplateFieldPromptId',
        as: 'prompts',
      })
      Goal.hasMany(models.GoalFieldResponse, { foreignKey: 'goalId', as: 'responses' })
      Goal.hasMany(models.GoalResource, { foreignKey: 'goalId', as: 'goalResources' })
      Goal.belongsToMany(models.Resource, {
        through: models.GoalResource,
        foreignKey: 'goalId',
        otherKey: 'resourceId',
        as: 'resources',
      })
      Goal.belongsTo(models.Goal, {
        foreignKey: 'mapsToParentGoalId',
        as: 'parentGoal',
      })
      Goal.hasMany(models.Goal, {
        foreignKey: 'mapsToParentGoalId',
        as: 'childGoals',
      })
      Goal.addScope('defaultScope', {
        where: {
          mapsToParentGoalId: null,
        },
      })
    }
  }
  Goal.init(
    {
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
          const { id } = this
          return `G-${id}`
        },
      },
      isCurated: {
        type: DataTypes.VIRTUAL,
        get() {
          const { goalTemplate } = this
          return goalTemplate?.creationMethod === CREATION_METHOD.CURATED
        },
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
      mapsToParentGoalId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: {
            tableName: 'Goals',
          },
          key: 'id',
        },
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
      createdVia: {
        type: DataTypes.ENUM(GOAL_CREATED_VIA),
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
      isSourceEditable: {
        type: DataTypes.VIRTUAL,
        get() {
          if (this.goalTemplate && this.goalTemplate.source) {
            return this.goalTemplate.source === null
          }

          return true
        },
      },
      prestandard: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Goal',
      paranoid: true,
      hooks: {
        beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
        beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
        afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
        afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
        afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
      },
    }
  )
  return Goal
}
