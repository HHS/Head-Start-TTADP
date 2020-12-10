const {
  Model,
} = require('sequelize');

/**
 * TopicGoal table. Junction table between Topics and Goals to support many to many relationship.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
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
