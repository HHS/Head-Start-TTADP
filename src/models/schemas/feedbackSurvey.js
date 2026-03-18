const Joi = require('joi');

const baseSchema = Joi.object({
  pageId: Joi.string().trim().required(),
  rating: Joi.number().integer().min(1).max(10)
    .required(),
  surveyType: Joi.string().valid('scale', 'thumbs').default('scale'),
  thumbs: Joi.string().valid('up', 'down').allow(null),
  comment: Joi.string().allow('').default(''),
  timestamp: Joi.string().isoDate(),
});

const feedbackSurveySchema = baseSchema
  .custom((value, helpers) => {
    if (value.surveyType !== 'thumbs') {
      return value;
    }

    if (!value.thumbs || !['up', 'down'].includes(value.thumbs)) {
      return helpers.error('any.invalidThumbs');
    }

    const expectedRating = value.thumbs === 'up' ? 10 : 1;
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
    'any.only': 'Survey type must be one of scale or thumbs',
    'any.invalidThumbs': 'Thumbs value must be one of up or down for thumbs surveys',
    'any.invalidThumbsRating': 'Thumbs surveys must use rating 10 for up and 1 for down',
  });

module.exports = feedbackSurveySchema;
