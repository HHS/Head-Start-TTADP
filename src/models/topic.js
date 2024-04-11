const {
  Model,
} = require('sequelize');

/**
 * Topics table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Topic extends Model {
    static associate(models) {
      Topic.hasMany(models.RoleTopic, { foreignKey: 'topicId', as: 'roleTopics' });
      Topic.belongsToMany(models.Role, {
        through: models.RoleTopic,
        foreignKey: 'topicId',
        otherKey: 'roleId',
        as: 'roles',
      });
      Topic.hasMany(models.ActivityReportObjectiveTopic, { foreignKey: 'topicId', as: 'activityReportObjectiveTopics' });
      Topic.belongsToMany(models.ActivityReportObjective, {
        through: models.ActivityReportObjectiveTopic,
        foreignKey: 'topicId',
        otherKey: 'activityReportObjectiveId',
        as: 'activityReportObjectives',
      });
      Topic.hasMany(models.ObjectiveTopic, { foreignKey: 'topicId', as: 'objectiveTopics' });
      Topic.belongsToMany(models.Objective, {
        through: models.ObjectiveTopic,
        foreignKey: 'topicId',
        otherKey: 'objectiveId',
        as: 'objectives',
      });
      Topic.hasMany(models.ObjectiveTemplateTopic, { foreignKey: 'topicId', as: 'objectiveTemplateTopics' });
      Topic.belongsToMany(models.ObjectiveTemplate, {
        through: models.ObjectiveTemplateTopic,
        foreignKey: 'topicId',
        otherKey: 'objectiveTemplateId',
        as: 'objectiveTemplates',
      });
    }
  }
  Topic.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Topic',
    paranoid: true,
  });
  return Topic;
};
