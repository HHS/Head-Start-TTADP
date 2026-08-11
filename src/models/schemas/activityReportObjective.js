const Joi = require('joi');
const { SUPPORT_TYPES } = require('@ttahub/common');

/**
 * Joi schema for validating an Activity Report's objectives at the
 * submission gate. Every objective on the report must have a support type
 * before the report can be submitted for review.
 *
 * allowUnknown is set so that objective fields not declared here are ignored.
 */
const activityReportObjectivesSchema = Joi.array().items(
  Joi.object({
    supportType: Joi.string()
      .valid(...SUPPORT_TYPES)
      .required()
      .messages({
        'any.required': 'all objectives must have a support type',
        'any.only': 'all objectives must have a support type',
        'string.base': 'all objectives must have a support type',
        'string.empty': 'all objectives must have a support type',
      }),
  }).options({ allowUnknown: true })
);

module.exports = activityReportObjectivesSchema;
