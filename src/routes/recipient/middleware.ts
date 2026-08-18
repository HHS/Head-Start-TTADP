import type { NextFunction, Request, Response } from 'express';
import httpCodes from 'http-codes';
import Joi from 'joi';
import { auditLogger } from '../../logger';

const errorMessage = 'Received malformed request query';

const recipientTimelineQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('date').default('date'),
  direction: Joi.string().valid('asc', 'desc').default('desc'),
  filters: Joi.array().items(Joi.string().trim().min(1).max(100)).max(20).single().default([]),
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
