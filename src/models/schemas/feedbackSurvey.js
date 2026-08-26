const Joi = require('joi');

const baseSchema = Joi.object({
  pageId: Joi.string().trim().required(),
  response: Joi.string().valid('yes', 'no').required(),
  comment: Joi.string().allow('').default(''),
  timestamp: Joi.string().isoDate(),
});

const feedbackSurveySchema = baseSchema.messages({
  'any.only': 'Response must be one of yes or no for yes/no surveys',
  'any.required': 'Response must be one of yes or no for yes/no surveys',
  'string.isoDate': 'Timestamp must be a valid ISO date string',
});

module.exports = feedbackSurveySchema;
