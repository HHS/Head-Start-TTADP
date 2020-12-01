const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Topic extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Topic.belongsToMany(models.Role, {
        through: models.RoleTopic, foreignKey: 'roleId', as: 'roles',
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
