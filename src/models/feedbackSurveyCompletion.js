const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class FeedbackSurveyCompletion extends Model {
    static associate() {}
  }

  FeedbackSurveyCompletion.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pageId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'FeedbackSurveyCompletion',
    tableName: 'FeedbackSurveyCompletions',
  });

  return FeedbackSurveyCompletion;
};
