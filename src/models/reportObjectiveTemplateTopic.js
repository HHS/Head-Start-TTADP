const { Model } = require('sequelize');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTemplateTopic extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportObjectiveTemplateTopic.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    reportObjectiveTemplateId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportObjectiveTemplates',
        },
        key: 'id',
      },
    },
    topicId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Topics',
        },
        key: 'id',
      },
    },
    objectiveTemplateTopicId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'ObjectiveTemplateTopics',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'ReportObjectiveTemplateTopic',
  });
  return ReportObjectiveTemplateTopic;
};
