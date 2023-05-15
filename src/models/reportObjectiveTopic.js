const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTopic extends Model {
    static associate(models) {
      ReportObjectiveTopic.belongsTo(models.ReportObjective, {
        foreignKey: 'reportObjectiveId',
        onDelete: 'cascade',
        as: 'reportObjective',
      });
      ReportObjectiveTopic.belongsTo(models.Topic, {
        foreignKey: 'topicId',
        onDelete: 'cascade',
        as: 'topic',
      });

      models.ReportObjective.hasMany(models.ReportObjectiveTopic, {
        foreignKey: 'reportObjectiveId',
        as: 'reportObjectiveTopics',
      });
      models.Topic.hasMany(models.ReportObjectiveTopic, {
        foreignKey: 'topicId',
        as: 'reportObjectiveTopics',
      });
      models.ReportObjective.belongsToMany(models.Topic, {
        through: models.ReportObjectiveTopic,
        foreignKey: 'reportObjectiveId',
        otherKey: 'topicId',
        as: 'topics',
      });
      models.Topic.belongsToMany(models.ReportObjective, {
        through: models.ReportObjectiveTopic,
        foreignKey: 'topicId',
        otherKey: 'reportObjectiveId',
        as: 'reportObjectives',
      });
    }
  }
  ReportObjectiveTopic.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    reportObjectiveId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    objectiveTopicId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    topicId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ReportObjectiveTopic',
  });
  return ReportObjectiveTopic;
};
