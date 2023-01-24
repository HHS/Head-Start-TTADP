const { Model } = require('sequelize');
// const { auditLogger } = require('../logger');

/**
   * ObjectiveTopic table. Junction table
   * between Objectives and topics
   * @param {} sequelize
   * @param {*} DataTypes
   */
export default (sequelize, DataTypes) => {
  class ObjectiveTemplateTopic extends Model {
    static associate(models) {
      ObjectiveTemplateTopic.belongsTo(models.ObjectiveTemplate, { foreignKey: 'objectiveTemplateId', onDelete: 'cascade', as: 'objectiveTemplate' });
      ObjectiveTemplateTopic.belongsTo(models.Topic, { foreignKey: 'topicId', onDelete: 'cascade', as: 'topic' });
    }
  }
  ObjectiveTemplateTopic.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    objectiveTemplateId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    topicId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplateTopic',
  });
  return ObjectiveTemplateTopic;
};
