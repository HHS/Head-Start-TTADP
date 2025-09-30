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

      models.Topic.belongsTo(
        models.Topic,
        {
          foreignKey: 'mapsTo',
          as: 'mapsToTopic',
        },
      );

      models.Topic.hasMany(
        models.Topic,
        {
          foreignKey: 'mapsTo',
          as: 'mapsFromTopics',
        },
      );
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
    deprecated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'Topic',
    paranoid: true,
  });
  return Topic;
};
