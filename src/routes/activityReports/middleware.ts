/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import moment from 'moment-timezone';
import httpCodes from 'http-codes';
import { NextFunction, Request, Response } from 'express';
import { APPROVER_STATUSES } from '@ttahub/common';
import { auditLogger } from '../../logger';

const errorMessage = 'Received malformed request body';

interface SaveReportCitationMonitoringReferenceBody {
  grantId: number;
  findingId: string;
  grantNumber: string;
  reviewName: string;
  standardId: number;
  findingType: string;
  findingSource: string;
  acro: string;
  severity: number;
  reportDeliveryDate: string;
  monitoringFindingStatusName: string;
}

interface SaveReportCitationBody {
  citation: string;
  monitoringReferences: SaveReportCitationMonitoringReferenceBody[];
}

interface SaveReportObjectiveBody {
  citations?: SaveReportCitationBody[] | null;
}

interface SaveReportGoalBody {
  objectives?: SaveReportObjectiveBody[];
}

interface SaveReportBody {
  goals?: SaveReportGoalBody[] | null;
}

interface SaveOtherEntityObjectivesBody {
  objectivesWithoutGoals?: SaveReportObjectiveBody[] | null;
}

const validateTimezone = (value: string, helpers: Joi.CustomHelpers) => {
  if (!moment.tz.zone(value)) {
    return helpers.error('any.invalid');
  }

  return value;
};

const reviewReportSchema = Joi.object({
  status: Joi.string()
    .valid(APPROVER_STATUSES.APPROVED, APPROVER_STATUSES.NEEDS_ACTION)
    .required(),
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

const monitoringReferenceSchema = Joi.object({
  grantId: Joi.number().integer().positive().required(),
  findingId: Joi.string().trim().required(),
  grantNumber: Joi.string().trim().required(),
  reviewName: Joi.string().trim().required(),
  standardId: Joi.number().integer().positive().required(),
  findingType: Joi.string().trim().required(),
  findingSource: Joi.string().trim().allow('', null).optional(),
  acro: Joi.string().trim().required(),
  severity: Joi.number().integer().min(0).required(),
  reportDeliveryDate: Joi.string().isoDate().required(),
  monitoringFindingStatusName: Joi.string().trim().required(),
}).unknown(true);

const citationSchema = Joi.object({
  monitoringReferences: Joi.array().items(monitoringReferenceSchema).required(),
}).unknown(true);

const optionalCitationsSchema = Joi.alternatives().try(
  Joi.array().items(citationSchema),
  Joi.valid(null),
).optional();

const saveReportCitationSchema = Joi.object({
  goals: Joi.array().items(
    Joi.object({
      objectives: Joi.array().items(
        Joi.object({
          citations: optionalCitationsSchema,
        }).unknown(true),
      ).optional(),
    }).unknown(true),
  ).optional(),
}).unknown(true);

const saveOtherEntityObjectivesCitationSchema = Joi.object({
  objectivesWithoutGoals: Joi.array().items(
    Joi.object({
      citations: optionalCitationsSchema,
    }).unknown(true),
  ).optional(),
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

export function checkSaveReportCitationBody(req: Request, res: Response, next: NextFunction) {
  const requestBody = req.body as SaveReportBody | undefined;

  if (!requestBody || requestBody.goals === undefined || requestBody.goals === null) {
    return next();
  }

  const { error } = saveReportCitationSchema.validate(requestBody, {
    abortEarly: false,
    allowUnknown: false,
  });

  if (error) {
    const msg = `${errorMessage}: ${error.message}`;
    console.log(msg);
    auditLogger.error(msg);
    return res.status(httpCodes.BAD_REQUEST).send(msg);
  }

  return next();
}

export function checkSaveOtherEntityObjectivesCitationBody(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestBody = req.body as SaveOtherEntityObjectivesBody | undefined;

  if (
    !requestBody
    || requestBody.objectivesWithoutGoals === undefined
    || requestBody.objectivesWithoutGoals === null
  ) {
    return next();
  }

  const { error } = saveOtherEntityObjectivesCitationSchema.validate(requestBody, {
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
