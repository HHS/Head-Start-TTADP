const Joi = require('joi');

const baseSchema = Joi.object({
  pageId: Joi.string().trim().required(),
  rating: Joi.number().integer().min(1).max(10)
    .required(),
  thumbs: Joi.string().valid('yes', 'no').allow(null),
  comment: Joi.string().allow('').default(''),
  timestamp: Joi.string().isoDate(),
});

const feedbackSurveySchema = baseSchema
  .custom((value, helpers) => {
    if (!value.thumbs || !['yes', 'no'].includes(value.thumbs)) {
      return helpers.error('any.invalidThumbs');
    }

    const expectedRating = value.thumbs === 'yes' ? 10 : 1;
    if (value.rating !== expectedRating) {
      return helpers.error('any.invalidThumbsRating');
    }

    return value;
  })
  .messages({
    'number.base': 'Rating must be a valid number',
    'number.min': 'Rating must be between 1 and 10',
    'number.max': 'Rating must be between 1 and 10',
    'string.isoDate': 'Timestamp must be a valid ISO date string',
    'any.invalidThumbs': 'Response must be one of yes or no for yes/no surveys',
    'any.invalidThumbsRating': 'Yes/no surveys must use rating 10 for yes and 1 for no',
  });

module.exports = feedbackSurveySchema;
