import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import type { NextFunction, Request, Response } from 'express';
import httpCodes from 'http-codes';
import Joi from 'joi';
import moment from 'moment';
import { DATE_FORMAT } from '../../constants';
import { auditLogger } from '../../logger';
import {
  REGIONAL_PD_WITH_NATIONAL_CENTERS,
  REGIONAL_TTA_NO_NATIONAL_CENTERS,
} from '../../services/eventFlow';

const errorMessage = 'Received malformed request body';

/**
 * Unknown keys in the JSONB `data` blob are stripped rather than rejected
 * (docs/adr/0024-schema-validation-with-joi.md). Clients round-trip whole API
 * responses back to us — completeEvent / suspendEvent / resumeEvent in
 * frontend/src/fetchers/event.js spread an entire event into the body — and
 * legacy rows carry keys that predate the allowlist, so rejecting would block
 * users on data they cannot fix. Malformed *known* keys still get a 400.
 *
 * convert:false because the validated value is written back to req.body and
 * persisted into JSONB; Joi's default coercion ("5" -> 5) would silently change
 * a stored field's type.
 */
const validationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true,
  convert: false,
};

/**
 * The TR forms store dates inside the blob in DATE_FORMAT (MM/DD/YYYY); the
 * authoritative values live in dedicated columns and this is the display mirror.
 * Validated with moment rather than a pattern so an impossible date such as
 * 13/45/2026 is rejected. Mirrors the validateTimezone custom validator in
 * src/routes/activityReports/middleware.ts.
 */
const validateDisplayDate = (value: string, helpers: Joi.CustomHelpers) => {
  if (!moment(value, DATE_FORMAT, true).isValid()) {
    return helpers.error('any.invalid');
  }

  return value;
};

const displayDate = Joi.string()
  .allow('', null)
  .custom(validateDisplayDate, `${DATE_FORMAT} date validation`)
  .messages({ 'any.invalid': `"{{#label}}" must be a ${DATE_FORMAT} date` });
const looseString = Joi.string().allow('', null);

/**
 * Array-valued fields accept '' and null as "nothing selected", the same way
 * `looseString` accepts them for text.
 *
 * The TR form registers its multi-selects through react-hook-form `Controller`s
 * with `defaultValue=""` (frontend/src/pages/TrainingReportForm/pages/
 * eventSummary.js), so a field the user never touched round-trips the empty
 * string rather than [], and rows saved that way before this schema existed
 * carry '' or null in the blob. Declared once and applied to every array field
 * rather than field by field, so a multi-select nobody has exercised yet cannot
 * 400 the way `additionalStates` did in tests/e2e/training-report.spec.ts.
 */
const looseArray = (items: Joi.Schema) => Joi.array().items(items).allow('', null);

const stringArray = looseArray(Joi.string().allow(''));
const regionArray = looseArray(Joi.alternatives().try(Joi.string(), Joi.number()));
const idArray = looseArray(Joi.number().integer().positive());

/**
 * Enum values are asserted only for `status` and `eventOrganizer`, which are
 * small, stable and partly server-set. The other controlled vocabularies
 * (reasons, targetPopulations, audience, training type, partnership) have
 * changed over time and are stored in the blob, so asserting them would 400 a
 * legacy record the moment a user tried to complete or suspend it.
 */
const eventDataSchema = Joi.object({
  eventName: looseString,
  eventOrganizer: Joi.string()
    .valid(REGIONAL_PD_WITH_NATIONAL_CENTERS, REGIONAL_TTA_NO_NATIONAL_CENTERS, 'IST TTA/Visit')
    .allow('', null),
  eventIntendedAudience: looseString,
  startDate: displayDate,
  endDate: displayDate,
  trainingType: looseString,
  reasons: stringArray,
  targetPopulations: stringArray,
  eventPartnership: looseString,
  vision: looseString,
  status: Joi.string()
    .valid(...Object.values(TRAINING_REPORT_STATUSES))
    .allow('', null),
  eventSubmitted: Joi.boolean(),
  additionalStates: stringArray,
  additionalRegions: regionArray,

  // Free-form subtrees. Joi.any() rather than Joi.object() because stripUnknown
  // recurses into object subschemas and would hollow these out.
  pageState: Joi.any(),
  owner: Joi.any(), // injected by updateEvent, then round-tripped by the client
  goal: Joi.any(), // written by src/models/hooks/goal.js
  goals: Joi.any(),

  // Written by the Smartsheet CSV import (src/services/event.ts csvImport).
  creator: looseString,
  istName: looseString,

  // Kept so the immutability check in createEvent/updateEvent still sees it.
  // The dedicated `eventId` column is the source of truth.
  eventId: looseString,

  // Known-bad keys, removed deterministically rather than as anonymous unknowns.
  // `sessionReports` is the TTAHUB-2745 regression.
  sessionReports: Joi.any().strip(),
  id: Joi.any().strip(),
  version: Joi.any().strip(),
  region: Joi.any().strip(),
  updatedAt: Joi.any().strip(),
  createdAt: Joi.any().strip(),
});

// completeEvent / suspendEvent / resumeEvent spread an entire API event here, so
// the extras are declared and stripped rather than left to unknown-key handling.
const eventBodyBase = {
  ownerId: Joi.number().integer().positive().required(),
  pocIds: idArray,
  collaboratorIds: idArray,
  regionId: Joi.number().integer().positive().required(),

  id: Joi.any().strip(),
  owner: Joi.any().strip(),
  eventId: Joi.any().strip(),
  updatedAt: Joi.any().strip(),
  createdAt: Joi.any().strip(),
  version: Joi.any().strip(),
  sessionReports: Joi.any().strip(),
  eventReportPilotNationalCenterUsers: Joi.any().strip(),
};

const createEventBodySchema = Joi.object({
  ...eventBodyBase,
  // createEvent throws without it; validate here so the caller gets a 400, not a 500.
  data: eventDataSchema.fork(['eventId'], () => Joi.string().min(1).required()).required(),
});

const updateEventBodySchema = Joi.object({
  ...eventBodyBase,
  data: eventDataSchema.required(),
});

export function checkCreateEventBody(req: Request, res: Response, next: NextFunction) {
  const { error, value } = createEventBodySchema.validate(req.body, validationOptions);

  if (error) {
    const msg = `${errorMessage}: ${error.message}`;
    auditLogger.error(msg);
    return res.status(httpCodes.BAD_REQUEST).send(msg);
  }

  req.body = value;
  return next();
}

export function checkUpdateEventBody(req: Request, res: Response, next: NextFunction) {
  const { error, value } = updateEventBodySchema.validate(req.body, validationOptions);

  if (error) {
    const msg = `${errorMessage}: ${error.message}`;
    auditLogger.error(msg);
    return res.status(httpCodes.BAD_REQUEST).send(msg);
  }

  req.body = value;
  return next();
}
