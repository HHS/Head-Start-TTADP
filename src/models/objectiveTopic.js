const { Model } = require('sequelize');
const { beforeValidate, afterCreate, afterDestroy } = require('./hooks/objectiveTopic');

/**
   * ObjectiveTopic table. Junction table
   * between Objectives and topics
   * @param {} sequelize
   * @param {*} DataTypes
   */
module.exports = (sequelize, DataTypes) => {
  class ObjectiveTopic extends Model {
    static associate(models) {
      ObjectiveTopic.belongsTo(models.Objective, { foreignKey: 'objectiveId', onDelete: 'cascade', as: 'objective' });
      ObjectiveTopic.belongsTo(models.Topic, { foreignKey: 'topicId', onDelete: 'cascade', as: 'topic' });
    }
  }
  ObjectiveTopic.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    objectiveId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    topicId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    onAR: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
    onApprovedAR: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTopic',
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ObjectiveTopic;
};
