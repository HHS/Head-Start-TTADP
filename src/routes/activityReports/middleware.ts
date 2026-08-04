import { APPROVER_STATUSES } from '@ttahub/common';
import type { NextFunction, Request, Response } from 'express';
import httpCodes from 'http-codes';
import Joi from 'joi';
import moment from 'moment-timezone';
import { Op } from 'sequelize';
import { auditLogger } from '../../logger';
import db from '../../models';

const { ActivityReportObjective } = db;

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

/**
 * Ensures every objective on the report has a support type before the report can be
 * submitted for review. This is enforced server-side because the client-side page
 * completeness check is the only other guard, and reports can otherwise enter review
 * (or block a manager from returning them) with a missing support type.
 *
 * The `activityReportId` param is validated as a positive integer by
 * `checkActivityReportIdParam`, which runs earlier in the route chain.
 */
export async function checkReportObjectiveSupportType(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { activityReportId } = req.params;

    // supportType is an enum column, so it can only be NULL or a valid value.
    const objectivesMissingSupportType = await ActivityReportObjective.count({
      where: {
        activityReportId,
        supportType: { [Op.is]: null },
      },
    });

    if (objectivesMissingSupportType > 0) {
      const msg = 'Unable to submit report: all objectives must have a support type';
      auditLogger.error(`${msg} (activityReportId: ${activityReportId})`);
      return res.status(httpCodes.BAD_REQUEST).send(msg);
    }

    return next();
  } catch (err) {
    return next(err);
  }
}
