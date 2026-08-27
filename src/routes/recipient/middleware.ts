import {
  TIMELINE_DATE_FILTER_CONDITIONS,
  TIMELINE_FILTER_TOPICS,
  TIMELINE_SELECT_FILTER_CONDITIONS,
} from '@ttahub/common/src/constants';
import type { NextFunction, Request, Response } from 'express';
import httpCodes from 'http-codes';
import Joi from 'joi';
import { auditLogger } from '../../logger';

const errorMessage = 'Received malformed request query';

const timelineFilterSchema = Joi.object({
  topic: Joi.string()
    .valid(...TIMELINE_FILTER_TOPICS)
    .required(),
  condition: Joi.string().required(),
  query: Joi.alternatives()
    .try(
      Joi.string().trim().allow('').max(500),
      Joi.array().items(Joi.string().trim().min(1).max(100)).min(1).max(20)
    )
    .required(),
})
  .custom((filter, helpers) => {
    const isDateFilter = filter.topic === 'date';
    const allowedConditions = isDateFilter
      ? TIMELINE_DATE_FILTER_CONDITIONS
      : TIMELINE_SELECT_FILTER_CONDITIONS;

    if (!allowedConditions.includes(filter.condition)) {
      return helpers.error('any.invalid');
    }

    if (
      (isDateFilter && typeof filter.query !== 'string') ||
      (!isDateFilter && !Array.isArray(filter.query))
    ) {
      return helpers.error('any.invalid');
    }

    return filter;
  })
  .unknown(false);

const serializedTimelineFilter = Joi.string()
  .trim()
  .min(1)
  .max(2000)
  .custom((value, helpers) => {
    let filter;

    try {
      filter = JSON.parse(value);
    } catch {
      return helpers.error('any.invalid');
    }

    const { error, value: validatedFilter } = timelineFilterSchema.validate(filter);
    return error ? helpers.error('any.invalid') : validatedFilter;
  });

const recipientTimelineQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('date').default('date'),
  direction: Joi.string().valid('asc', 'desc').default('desc'),
  filters: Joi.array().items(serializedTimelineFilter).max(20).single().default([]),
  excludeMultiRecipientCommunications: Joi.boolean().default(false),
}).unknown(false);

export function checkRecipientTimelineQuery(req: Request, res: Response, next: NextFunction) {
  const { error, value } = recipientTimelineQuerySchema.validate(req.query, {
    abortEarly: false,
  });

  if (error) {
    const message = `${errorMessage}: ${error.message}`;
    auditLogger.error(message);
    return res.status(httpCodes.BAD_REQUEST).send(message);
  }

  res.locals.recipientTimelineQuery = value;
  return next();
}
