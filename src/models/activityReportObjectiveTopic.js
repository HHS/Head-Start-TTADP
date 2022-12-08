const { Model } = require('sequelize');
const { afterDestroy } = require('./hooks/activityReportObjectiveTopic');

/**
   * ObjectiveTopic table. Junction table
   * between Objectives and topics
   * @param {} sequelize
   * @param {*} DataTypes
   */
module.exports = (sequelize, DataTypes) => {
  class ActivityReportObjectiveTopic extends Model {
    static associate(models) {
      ActivityReportObjectiveTopic.belongsTo(models.ActivityReportObjective, {
        foreignKey: 'activityReportObjectiveId',
        onDelete: 'cascade',
        as: 'activityReportObjective',
      });
      ActivityReportObjectiveTopic.belongsTo(models.Topic, { foreignKey: 'topicId', onDelete: 'cascade', as: 'topic' });
    }
  }
  ActivityReportObjectiveTopic.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportObjectiveId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    topicId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveTopic',
    hooks: {
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ActivityReportObjectiveTopic;
};
