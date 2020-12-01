const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TopicGoal extends Model {
    static associate() {
    }
  }
  TopicGoal.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'TopicGoal',
  });
  return TopicGoal;
};
