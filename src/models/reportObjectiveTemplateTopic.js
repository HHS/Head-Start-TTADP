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

      models.ReportObjectiveTemplate.hasMany(models.ReportObjectiveTemplateTopic, {
        foreignKey: 'reportObjectiveTemplateId',
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
    modelName: 'ReportObjectiveTemplateTopic',
  });
  return ReportObjectiveTemplateTopic;
};
