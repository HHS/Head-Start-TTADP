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
        through: models.RoleTopic, foreignKey: 'topicId', as: 'roles',
      });
      Topic.belongsToMany(models.Goal, {
        through: models.TopicGoal, foreignKey: 'topicId', as: 'goals',
      });
    }
  }
  Topic.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    sequelize,
    modelName: 'Topic',
  });
  return Topic;
};
