const {
  Model,
} = require('sequelize');

/**
   * ObjectiveTopic table. Junction table
   * between Objectives and topics
   * @param {} sequelize
   * @param {*} DataTypes
   */
module.exports = (sequelize, DataTypes) => {
  class ObjectiveTopic extends Model {
    static associate() {
      // ObjectiveTopic.belongsTo(models.Topic, { foreignKey: 'topicId', as: 'topic' });
      // ObjectiveTopic.belongsTo(models.Objective, { foreignKey: 'objectiveId', as: 'objective' });
    }
  }
  ObjectiveTopic.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    // objectiveId: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    // },
    // topicId: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    // },
  }, {
    sequelize,
    modelName: 'ObjectiveTopic',
  });
  return ObjectiveTopic;
};
