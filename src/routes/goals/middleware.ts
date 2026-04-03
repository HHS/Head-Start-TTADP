/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import httpCodes from 'http-codes';
import { NextFunction, Request, Response } from 'express';
import { auditLogger } from '../../logger';

const errorMessage = 'Received malformed goal dashboard request query';

const integerLikeString = Joi.string().pattern(/^\d+$/);

const dashboardQuerySchema = Joi.object({
  'region.in': Joi.alternatives().try(integerLikeString, Joi.array().items(integerLikeString)),
  'region.in[]': Joi.alternatives().try(integerLikeString, Joi.array().items(integerLikeString)),
}).unknown(true);

export function checkGoalDashboardQuery(req: Request, res: Response, next: NextFunction) {
  const { error } = dashboardQuerySchema.validate(req.query, {
    abortEarly: false,
  });

  if (error) {
    const msg = `${errorMessage}: ${error.message}`;
    auditLogger.error(msg);
    return res.status(httpCodes.BAD_REQUEST).send(msg);
  }

  return next();
}
