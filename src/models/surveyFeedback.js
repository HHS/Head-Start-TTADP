const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class SurveyFeedback extends Model {
    static associate(models) {
      SurveyFeedback.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  SurveyFeedback.init({
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
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 10,
      },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'SurveyFeedback',
  });

  return SurveyFeedback;
};
