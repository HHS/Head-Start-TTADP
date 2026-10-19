import { TTA_REQUEST_ORIGINATORS } from '@ttahub/common';
import type { NextFunction, Request, Response } from 'express';
import httpCodes from 'http-codes';
import Joi from 'joi';
import { auditLogger } from '../../logger';

const errorMessage = 'Received malformed request body';

/**
 * A draft is saved as it stands, so nothing is required beyond the region a new request
 * belongs to. Unknown keys, including the id, status and creator a client might echo back,
 * are stripped rather than rejected; malformed known keys get a 400.
 *
 * convert:false so a "5" is rejected rather than quietly stored as 5.
 */
const validationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true,
  convert: false,
};

const looseString = Joi.string().allow('', null);
const nullableId = Joi.number().integer().positive().allow(null);

const citationSchema = Joi.object({
  citation: Joi.string().min(1).required(),
  findingType: looseString,
});

const ttaRequestBodySchema = Joi.object({
  recipientId: nullableId,
  grantIds: Joi.array().items(Joi.number().integer().positive()).unique(),
  recipientAware: Joi.boolean().allow(null),
  originator: Joi.string()
    .valid(...TTA_REQUEST_ORIGINATORS)
    .allow(null),
  goalTemplateId: nullableId,
  citations: Joi.array().items(citationSchema).unique('citation'),
  context: looseString,
  creatorNotes: looseString,
  reviewerId: nullableId,
});

// the region is chosen once, when the request is created
export const createTtaRequestBodySchema = ttaRequestBodySchema.keys({
  regionId: Joi.number().integer().positive().required(),
});

export const updateTtaRequestBodySchema = ttaRequestBodySchema.keys({
  regionId: Joi.any().strip(),
});

export function checkCreateTtaRequestBody(req: Request, res: Response, next: NextFunction) {
  const { error, value } = createTtaRequestBodySchema.validate(req.body, validationOptions);

  if (error) {
    const msg = `${errorMessage}: ${error.message}`;
    auditLogger.error(msg);
    return res.status(httpCodes.BAD_REQUEST).send(msg);
  }

  req.body = value;
  return next();
}

export function checkUpdateTtaRequestBody(req: Request, res: Response, next: NextFunction) {
  const { error, value } = updateTtaRequestBodySchema.validate(req.body, validationOptions);

  if (error) {
    const msg = `${errorMessage}: ${error.message}`;
    auditLogger.error(msg);
    return res.status(httpCodes.BAD_REQUEST).send(msg);
  }

  req.body = value;
  return next();
}
