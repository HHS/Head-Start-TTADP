const { Model } = require('sequelize');
const { FEEDBACK_SURVEY_STATUSES } = require('../constants');

export default (sequelize, DataTypes) => {
  class FeedbackSurveyDefinition extends Model {
    static associate(models) {
      FeedbackSurveyDefinition.hasMany(models.FeedbackSurveyQuestion, {
        foreignKey: 'surveyId',
        as: 'questions',
      });
      FeedbackSurveyDefinition.hasMany(models.FeedbackSurvey, {
        foreignKey: 'surveyId',
        as: 'responses',
      });
      FeedbackSurveyDefinition.hasMany(models.FeedbackSurveyCompletion, {
        foreignKey: 'surveyId',
        as: 'completions',
      });
      FeedbackSurveyDefinition.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    }
  }

  FeedbackSurveyDefinition.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    pageId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    // NULL end date = open until an admin closes it manually
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(Object.values(FEEDBACK_SURVEY_STATUSES)),
      allowNull: false,
      defaultValue: FEEDBACK_SURVEY_STATUSES.ACTIVE,
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'Users',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'FeedbackSurveyDefinition',
    tableName: 'FeedbackSurveyDefinitions',
    validate: {
      endDateNotBeforeStartDate() {
        if (this.startDate && this.endDate && this.endDate < this.startDate) {
          throw new Error('End date must be on or after start date');
        }
      },
    },
  });

  return FeedbackSurveyDefinition;
};
