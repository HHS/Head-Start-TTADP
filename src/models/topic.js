const {
  Model,
} = require('sequelize');

/**
 * Topics table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class Topic extends Model {
    static associate(models) {
      Topic.belongsToMany(models.Role, {
        through: models.RoleTopic,
        foreignKey: 'topicId',
        as: 'roles',
        hooks: true,
      });
      Topic.belongsToMany(models.Objective, {
        through: models.ObjectiveTopic,
        foreignKey: 'topicId',
        as: 'objectives',
        hooks: true,
      });
      Topic.hasMany(models.ObjectiveTemplateTopic, { foreignKey: 'topicId', as: 'objectiveTemplateTopics', hooks: true });
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
