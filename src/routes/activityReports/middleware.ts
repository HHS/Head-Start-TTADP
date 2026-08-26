import { APPROVER_STATUSES } from '@ttahub/common';
import type { NextFunction, Request, Response } from 'express';
import httpCodes from 'http-codes';
import Joi from 'joi';
import moment from 'moment-timezone';
import { auditLogger } from '../../logger';

const errorMessage = 'Received malformed request body';

const validateTimezone = (value: string, helpers: Joi.CustomHelpers) => {
  if (!moment.tz.zone(value)) {
    return helpers.error('any.invalid');
  }

  return value;
};

const reviewReportSchema = Joi.object({
  status: Joi.string().valid(APPROVER_STATUSES.APPROVED, APPROVER_STATUSES.NEEDS_ACTION).required(),
  note: Joi.string().allow('', null).optional(),
  approvedAtTimezone: Joi.string()
    .when('status', {
      is: APPROVER_STATUSES.APPROVED,
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .custom(validateTimezone, 'IANA timezone validation')
    .messages({
      'any.required': '"approvedAtTimezone" is required when status is approved',
      'any.invalid': '"approvedAtTimezone" must be a valid IANA timezone',
    }),
});

const submitReportSchema = Joi.object({
  approverUserIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
}).unknown(true);

export function checkReviewReportBody(req: Request, res: Response, next: NextFunction) {
  const { error } = reviewReportSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
  });

  if (error) {
    const msg = `${errorMessage}: ${error.message}`;
    auditLogger.error(msg);
    return res.status(httpCodes.BAD_REQUEST).send(msg);
  }

  return next();
}

export function checkSubmitReportBody(req: Request, res: Response, next: NextFunction) {
  const { error } = submitReportSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const msg = `${errorMessage}: ${error.message}`;
    auditLogger.error(msg);
    return res.status(httpCodes.BAD_REQUEST).send(msg);
  }

  return next();
}
