const Joi = require('joi');

/**
 * Joi schema for Activity Report field validation.
 * Used as the single source of truth for required fields
 * at both the submission and approval status gates.
 *
 * allowUnknown is set so that AR fields not declared here are ignored.
 */
const activityReportSchema = Joi.object({
  deliveryMethod: Joi.string().required(),
  duration: Joi.number().required(),
  startDate: Joi.string().required(),
  endDate: Joi.string().required(),
  activityRecipientType: Joi.string().required(),
  requester: Joi.string().required(),
  targetPopulations: Joi.array().min(1).required(),
  participants: Joi.array().min(1).required(),
  topics: Joi.array().min(1).required(),
  ttaType: Joi.array().min(1).required(),
  creatorRole: Joi.string().optional(),
  activityReason: Joi.string().required(),
  language: Joi.array().min(1).required(),
  // For hybrid delivery, require in-person and virtual counts instead of a single total
  numberOfParticipants: Joi.when('deliveryMethod', {
    is: 'hybrid',
    then: Joi.any().optional(),
    otherwise: Joi.number().integer().required(),
  }),
  numberOfParticipantsInPerson: Joi.when('deliveryMethod', {
    is: 'hybrid',
    then: Joi.number().integer().required(),
    otherwise: Joi.any().optional(),
  }),
  numberOfParticipantsVirtually: Joi.when('deliveryMethod', {
    is: 'hybrid',
    then: Joi.number().integer().required(),
    otherwise: Joi.any().optional(),
  }),
}).options({ allowUnknown: true });

module.exports = activityReportSchema;
