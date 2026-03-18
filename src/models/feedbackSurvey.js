const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class FeedbackSurvey extends Model {
    static associate(models) {
      FeedbackSurvey.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  FeedbackSurvey.init({
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
    surveyType: {
      type: DataTypes.ENUM('scale', 'thumbs'),
      allowNull: false,
      // Keep enum default typed to match database representation in LDM checks.
      // eslint-disable-next-line @typescript-eslint/quotes
      defaultValue: sequelize.literal(`'scale'::"enum_FeedbackSurveys_surveyType"`),
      validate: {
        isIn: [['scale', 'thumbs']],
      },
    },
    thumbs: {
      type: DataTypes.ENUM('up', 'down'),
      allowNull: true,
      validate: {
        isIn: {
          args: [['up', 'down']],
          msg: 'Thumbs must be one of up or down',
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
