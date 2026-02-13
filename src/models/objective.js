const { Model } = require('sequelize')
const { CLOSE_SUSPEND_REASONS } = require('@ttahub/common')
const { beforeValidate, beforeUpdate, afterUpdate, afterCreate } = require('./hooks/objective')

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
      })
      Objective.hasMany(models.ActivityReportObjective, {
        foreignKey: 'objectiveId',
        as: 'activityReportObjectives',
      })
      Objective.hasMany(models.ActivityReportObjective, {
        foreignKey: 'originalObjectiveId',
        as: 'reassignedActivityReportObjectives',
      })
      Objective.belongsTo(models.OtherEntity, { foreignKey: 'otherEntityId', as: 'otherEntity' })
      Objective.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' })
      Objective.belongsTo(models.ObjectiveTemplate, {
        foreignKey: 'objectiveTemplateId',
        as: 'objectiveTemplate',
        onDelete: 'cascade',
      })
      Objective.belongsTo(models.Objective, {
        foreignKey: 'mapsToParentObjectiveId',
        as: 'parentObjective',
      })
      Objective.hasMany(models.Objective, {
        foreignKey: 'mapsToParentObjectiveId',
        as: 'childObjectives',
      })
      Objective.belongsTo(models.ActivityReport, {
        foreignKey: 'createdViaActivityReportId',
        as: 'createdViaActivityReport',
      })
    }
  }
  Objective.init(
    {
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
        defaultValue: false,
        allowNull: false,
      },
      onApprovedAR: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
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
        defaultValue: 1,
      },
      closeSuspendReason: {
        allowNull: true,
        type: DataTypes.ENUM(CLOSE_SUSPEND_REASONS),
      },
      createdViaActivityReportId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      closeSuspendContext: {
        type: DataTypes.TEXT,
      },
      mapsToParentObjectiveId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: {
            tableName: 'Objectives',
          },
          key: 'id',
        },
      },
    },
    {
      sequelize,
      paranoid: true,
      modelName: 'Objective',
      hooks: {
        beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
        afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
        afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      },
    }
  )
  return Objective
}
