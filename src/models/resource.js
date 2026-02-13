const { Model } = require('sequelize')
const { beforeValidate, afterCreate } = require('./hooks/resource')

export default (sequelize, DataTypes) => {
  class Resource extends Model {
    static associate(models) {
      Resource.hasMany(models.ActivityReportResource, {
        foreignKey: 'resourceId',
        as: 'activityReportResources',
      })
      Resource.belongsToMany(models.ActivityReport, {
        through: models.ActivityReportResource,
        foreignKey: 'resourceId',
        otherKey: 'activityReportId',
        as: 'activityReports',
      })
      Resource.hasMany(models.ActivityReportGoalResource, {
        foreignKey: 'resourceId',
        as: 'activityReportGoalResources',
      })
      Resource.belongsToMany(models.ActivityReportGoal, {
        through: models.ActivityReportGoalResource,
        foreignKey: 'resourceId',
        otherKey: 'activityReportGoalId',
        as: 'activityReportGoals',
      })
      Resource.hasMany(models.ActivityReportObjectiveResource, {
        foreignKey: 'resourceId',
        as: 'activityReportObjectiveResources',
      })
      Resource.belongsToMany(models.ActivityReportObjective, {
        through: models.ActivityReportObjectiveResource,
        foreignKey: 'resourceId',
        otherKey: 'activityReportObjectiveId',
        as: 'activityReportObjectives',
      })
      Resource.hasMany(models.NextStepResource, {
        foreignKey: 'resourceId',
        as: 'nextStepResources',
      })
      Resource.belongsToMany(models.NextStep, {
        through: models.NextStepResource,
        foreignKey: 'resourceId',
        otherKey: 'nextStepId',
        as: 'nextSteps',
      })
      Resource.hasMany(models.GoalResource, { foreignKey: 'resourceId', as: 'goalResources' })
      Resource.belongsToMany(models.Goal, {
        through: models.GoalResource,
        foreignKey: 'resourceId',
        otherKey: 'goalId',
        as: 'goals',
      })
      Resource.hasMany(models.GoalTemplateResource, {
        foreignKey: 'resourceId',
        as: 'goalTemplateResources',
      })
      Resource.belongsToMany(models.GoalTemplate, {
        through: models.GoalTemplateResource,
        foreignKey: 'resourceId',
        otherKey: 'goalTemplateId',
        as: 'goalTemplates',
      })
      Resource.hasMany(models.Resource, {
        foreignKey: 'mapsTo',
        as: 'mapsFromResource',
      })
      Resource.belongsTo(models.Resource, {
        foreignKey: 'mapsTo',
        as: 'mapsToResource',
      })
    }
  }
  Resource.init(
    {
      domain: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
      url: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
      title: {
        allowNull: true,
        type: DataTypes.TEXT,
      },
      mimeType: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      lastStatusCode: {
        allowNull: true,
        type: DataTypes.INTEGER,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      metadataUpdatedAt: {
        allowNull: true,
        type: DataTypes.DATE,
      },
      mapsTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'Resource',
          },
          key: 'id',
        },
      },
    },
    {
      hooks: {
        beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
        afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      },
      sequelize,
      modelName: 'Resource',
    }
  )
  return Resource
}
