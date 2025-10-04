const { Model } = require('sequelize');
const { CREATION_METHOD } = require('../constants');
const {
  beforeValidate,
  beforeUpdate,
  afterCreate,
  afterUpdate,
} = require('./hooks/goalTemplate');
// const { auditLogger } = require('../logger');

export default (sequelize, DataTypes) => {
  class GoalTemplate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      GoalTemplate.hasMany(models.Goal, { foreignKey: 'goalTemplateId', as: 'goals' });
      GoalTemplate.belongsTo(models.Region, { foreignKey: 'regionId', as: 'region' });
      GoalTemplate.hasMany(
        models.GoalTemplateObjectiveTemplate,
        { foreignKey: 'goalTemplateId', as: 'goalTemplateObjectiveTemplates' },
      );
      GoalTemplate.hasMany(models.GoalTemplateFieldPrompt, { foreignKey: 'goalTemplateId', as: 'prompts' });
      GoalTemplate.hasMany(models.GoalTemplateResource, { foreignKey: 'goalTemplateId', as: 'goalTemplateResources' });
      GoalTemplate.belongsToMany(models.Resource, {
        through: models.GoalTemplateResource,
        foreignKey: 'goalTemplateId',
        otherKey: 'resourceId',
        as: 'resources',
      });
      GoalTemplate.hasMany(models.CollabReportGoal, { foreignKey: 'goalTemplateId', as: 'collabReportGoals' });
      // Session Report Pilot Goal Templates.
      GoalTemplate.hasMany(models.SessionReportPilotGoalTemplate, { foreignKey: 'goalTemplateId', as: 'sessionReportGoalTemplates' });
      GoalTemplate.belongsToMany(models.SessionReportPilot, {
        through: models.SessionReportPilotGoalTemplate,
        foreignKey: 'goalTemplateId',
        otherKey: 'sessionReportPilotId',
        as: 'sessionReports',
      });
    }
  }
  GoalTemplate.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    hash: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    templateName: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    creationMethod: {
      allowNull: false,
      type: DataTypes.ENUM(Object.values(CREATION_METHOD)),
    },
    lastUsed: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    templateNameModifiedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    source: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    standard: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
    isSourceEditable: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.source === null;
      },
    },
  }, {
    sequelize,
    modelName: 'GoalTemplate',
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
    paranoid: true,
  });
  return GoalTemplate;
};
