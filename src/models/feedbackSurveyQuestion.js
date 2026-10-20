const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class FeedbackSurveyQuestion extends Model {
    static associate(models) {
      FeedbackSurveyQuestion.belongsTo(models.FeedbackSurveyDefinition, {
        foreignKey: 'surveyId',
        as: 'survey',
      });
    }
  }

  FeedbackSurveyQuestion.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    surveyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'FeedbackSurveyDefinitions',
        },
        key: 'id',
      },
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'FeedbackSurveyQuestion',
    tableName: 'FeedbackSurveyQuestions',
  });

  return FeedbackSurveyQuestion;
};
