const { Model } = require('sequelize')

/**
 * ObjectiveTopic table. Junction table
 * between Objectives and topics
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ActivityReportObjectiveTopic extends Model {
    static associate(models) {
      ActivityReportObjectiveTopic.belongsTo(models.ActivityReportObjective, {
        foreignKey: 'activityReportObjectiveId',
        onDelete: 'cascade',
        as: 'activityReportObjective',
      })
      ActivityReportObjectiveTopic.belongsTo(models.Topic, {
        foreignKey: 'topicId',
        onDelete: 'cascade',
        as: 'topic',
      })
    }
  }
  ActivityReportObjectiveTopic.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      activityReportObjectiveId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      topicId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ActivityReportObjectiveTopic',
    }
  )
  return ActivityReportObjectiveTopic
}
