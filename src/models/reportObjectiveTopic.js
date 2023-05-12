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
      models.ReportObjective.belongsToMany(models.Topic, {
        through: models.ReportObjectiveTopic,
        foreignKey: 'reportObjectiveId',
        otherKey: 'topicId',
        as: 'topics',
      });
    }
  }
  ReportObjectiveTopic.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    reportObjectiveId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    topicId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ReportObjectiveTopic',
  });
  return ReportObjectiveTopic;
};
