const Joi = require('joi');
const { FEEDBACK_SURVEY_PAGES } = require('../../constants');

const MAX_COMMENT_LENGTH = 140;

const answerSchema = Joi.object({
  questionId: Joi.number().integer().positive().required(),
  response: Joi.string().valid('yes', 'no').required().messages({
    'any.only': 'Response must be one of yes or no for yes/no surveys',
    'any.required': 'Response must be one of yes or no for yes/no surveys',
  }),
  comment: Joi.string().allow('').max(MAX_COMMENT_LENGTH).default(''),
});

const feedbackSurveySchema = Joi.object({
  surveyId: Joi.number().integer().positive().required(),
  responses: Joi.array().items(answerSchema).min(1).unique('questionId').required(),
  timestamp: Joi.string().isoDate(),
}).messages({
  'string.isoDate': 'Timestamp must be a valid ISO date string',
});

const dateOnly = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
  'string.pattern.base': '{#label} must be a YYYY-MM-DD date',
});

// Either a date range, or manualClose: the survey opens today and stays open until an admin closes it
const surveyDateRangeSchema = Joi.object({
  manualClose: Joi.boolean().default(false),
  startDate: Joi.when('manualClose', { is: true, then: Joi.forbidden(), otherwise: dateOnly.label('Start date') }),
  endDate: Joi.when('manualClose', { is: true, then: Joi.forbidden(), otherwise: dateOnly.label('End date') }),
});

const createSurveyDefinitionSchema = surveyDateRangeSchema.keys({
  pageId: Joi.string()
    .valid(...Object.keys(FEEDBACK_SURVEY_PAGES))
    .required()
    .messages({ 'any.only': 'Unknown survey page' }),
  // One question per survey for now; stored as a FeedbackSurveyQuestion row so more can be added later
  question: Joi.string().trim().min(1).max(500).required(),
});

module.exports = feedbackSurveySchema;
module.exports.MAX_COMMENT_LENGTH = MAX_COMMENT_LENGTH;
module.exports.surveyDateRangeSchema = surveyDateRangeSchema;
module.exports.createSurveyDefinitionSchema = createSurveyDefinitionSchema;
