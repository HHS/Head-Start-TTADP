const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class FeedbackSurvey extends Model {
    static associate() {}
  }

  FeedbackSurvey.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    userRoles: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
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
    thumbs: {
      type: DataTypes.ENUM('yes', 'no'),
      allowNull: true,
      validate: {
        isIn: {
          args: [['yes', 'no']],
          msg: 'Response must be one of yes or no',
        },
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
    modelName: 'FeedbackSurvey',
    tableName: 'FeedbackSurveys',
  });

  return FeedbackSurvey;
};
