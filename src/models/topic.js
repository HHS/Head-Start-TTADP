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
      Topic.belongsToMany(models.Role, {
        through: models.RoleTopic, foreignKey: 'topicId', as: 'roles',
      });
      Topic.belongsToMany(models.Objective, { through: models.ObjectiveTopic, foreignKey: 'topicId', as: 'objectives' });
      Topic.hasMany(models.ObjectiveTemplateTopic, { foreignKey: 'topicId', as: 'objectiveTemplateTopics' });
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
