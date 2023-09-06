const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTemplateTopic extends Model {
    static associate(models) {
      ReportObjectiveTemplateTopic.belongsTo(models.ReportObjectiveTemplate, {
        foreignKey: 'reportObjectiveTemplateId',
        onDelete: 'cascade',
        as: 'reportObjectiveTemplate',
      });
      ReportObjectiveTemplateTopic.belongsTo(models.Topic, {
        foreignKey: 'topicId',
        onDelete: 'cascade',
        as: 'topic',
      });
      ReportObjectiveTemplateTopic.belongsTo(models.ObjectiveTemplateTopic, {
        foreignKey: 'objectiveTemplateTopicId',
        onDelete: 'cascade',
        as: 'objectiveTemplateTopic',
      });
      models.ObjectiveTemplateTopic.hasMany(models.ReportObjectiveTemplateTopic, {
        foreignKey: 'objectiveTemplateTopicId',
        onDelete: 'cascade',
        as: 'reportObjectiveTemplateTopics',
      });

      models.ReportObjectiveTemplate.hasMany(models.ReportObjectiveTemplateTopic, {
        foreignKey: 'reportObjectiveTemplateId',
        as: 'reportObjectiveTemplateTopics',
      });
      models.Topic.hasMany(models.ReportObjectiveTemplateTopic, {
        foreignKey: 'topicId',
        onDelete: 'cascade',
        as: 'reportObjectiveTemplateTopics',
      });
      models.ReportObjectiveTemplate.belongsToMany(models.Topic, {
        through: models.ReportObjectiveTemplateTopic,
        foreignKey: 'reportObjectiveTemplateId',
        otherKey: 'topicId',
        as: 'topics',
      });

      models.Topic.belongsToMany(models.ReportObjectiveTemplate, {
        through: models.ReportObjectiveTemplateTopic,
        foreignKey: 'topicId',
        otherKey: 'reportObjectiveTemplateId',
        as: 'reportObjectiveTemplates',
      });
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
