import { COMMUNICATION_PURPOSES } from '@ttahub/common';
import type { RecipientTimelineFilter } from '@ttahub/common/src/recipientTimeline';
import type { NextFunction, Request, Response } from 'express';
import httpCodes from 'http-codes';
import Joi from 'joi';
import { auditLogger } from '../../logger';

const errorMessage = 'Received malformed request query';

const dateQuery = Joi.string().trim().min(1).max(500);
const selectQuery = Joi.array()
  .items(Joi.string().trim().min(1).max(100))
  .min(1)
  .max(20)
  .single();
const purposeQuery = Joi.array()
  .items(Joi.string().trim().valid(...COMMUNICATION_PURPOSES))
  .min(1)
  .max(20)
  .single();

const recipientTimelineQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('date').default('date'),
  direction: Joi.string().valid('asc', 'desc').default('desc'),
  'date.in': Joi.array().items(dateQuery).length(1).single(),
  'date.win': dateQuery,
  'date.aft': dateQuery,
  'date.bef': dateQuery,
  'purpose.in': purposeQuery,
  'purpose.nin': purposeQuery,
  'standard.in': selectQuery,
  'standard.nin': selectQuery,
  'eventType.in': selectQuery,
  'eventType.nin': selectQuery,
  excludeMultiRecipientCommunications: Joi.boolean().default(false),
}).unknown(false);

const filterParameters: Array<{
  parameter: string;
  topic: RecipientTimelineFilter['topic'];
  condition: RecipientTimelineFilter['condition'];
}> = [
  { parameter: 'date.in', topic: 'date', condition: 'is' },
  { parameter: 'date.win', topic: 'date', condition: 'is within' },
  { parameter: 'date.aft', topic: 'date', condition: 'is on or after' },
  { parameter: 'date.bef', topic: 'date', condition: 'is on or before' },
  { parameter: 'purpose.in', topic: 'purpose', condition: 'is' },
  { parameter: 'purpose.nin', topic: 'purpose', condition: 'is not' },
  { parameter: 'standard.in', topic: 'standard', condition: 'is' },
  { parameter: 'standard.nin', topic: 'standard', condition: 'is not' },
  { parameter: 'eventType.in', topic: 'eventType', condition: 'is' },
  { parameter: 'eventType.nin', topic: 'eventType', condition: 'is not' },
];
const filterParameterNames = new Set(filterParameters.map(({ parameter }) => parameter));

export function checkRecipientTimelineQuery(req: Request, res: Response, next: NextFunction) {
  const { error, value } = recipientTimelineQuerySchema.validate(req.query, {
    abortEarly: false,
  });

  if (error) {
    const message = `${errorMessage}: ${error.message}`;
    auditLogger.error(message);
    return res.status(httpCodes.BAD_REQUEST).send(message);
  }

  const filters = filterParameters.flatMap(({ parameter, topic, condition }) => {
    const query = value[parameter];
    if (query === undefined) return [];
    return [{ topic, condition, query: parameter === 'date.in' ? query[0] : query }];
  });
  const controls = Object.fromEntries(
    Object.entries(value).filter(([parameter]) => !filterParameterNames.has(parameter))
  );

  res.locals.recipientTimelineQuery = { ...controls, filters };
  return next();
}
