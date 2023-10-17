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
      Topic.belongsTo(models.Topic.scope(), {
        foreignKey: 'mapsTo',
        as: 'mapsToTopic',
      });
      Topic.hasMany(models.Topic.scope(), {
        foreignKey: 'mapsTo',
        as: 'mapsFromTopics',
      });
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

      models.Topic.addScope('defaultScope', {
        include: [{
          model: models.Topic.scope(),
          as: 'mapsToTopic',
          required: false,
        }],
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
      references: { model: { tableName: 'Topics' }, key: 'id' },
    },
    latestName: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToTopic').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToTopic').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'Topic',
    paranoid: true,
  });
  return Topic;
};
