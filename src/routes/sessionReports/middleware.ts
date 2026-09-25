import { REPORT_STATUSES, SUPPORT_TYPES, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import type { NextFunction, Request, Response } from 'express';
import httpCodes from 'http-codes';
import Joi from 'joi';
import moment from 'moment';
import { DATE_FORMAT } from '../../constants';
import { auditLogger } from '../../logger';
import { FACILITATION_NATIONAL_CENTER } from '../../services/eventFlow';

const errorMessage = 'Received malformed request body';

// See the note in src/routes/events/middleware.ts for why unknown keys are
// stripped rather than rejected, and why convert is off.
const validationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true,
  convert: false,
};

// See the validateDisplayDate note in src/routes/events/middleware.ts.
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

// Every array-valued field accepts '' and null as "nothing selected" — see the
// looseArray note in src/routes/events/middleware.ts. Session blobs inherit
// values such as `additionalStates` from the event, so they carry the same
// empty strings, and the session form registers its own multi-selects the same
// way the TR form does.
const looseArray = (items: Joi.Schema) => Joi.array().items(items).allow('', null);

const stringArray = looseArray(Joi.string().allow(''));
const regionArray = looseArray(Joi.alternatives().try(Joi.string(), Joi.number()));
// Form number inputs submit strings. convert is off, so accept both rather than
// silently coercing a stored value to a different JSON type.
const numberish = Joi.alternatives().try(Joi.number(), Joi.string().allow('')).allow(null);
const nextSteps = looseArray(
  Joi.object({
    note: Joi.string().allow(''),
    completeDate: Joi.string().allow(''),
  }).unknown(true)
);
// Option-shaped values ({ value, label }) and richer association payloads vary
// enough that asserting their inner shape would reject valid saves.
const optionList = looseArray(Joi.any());

/**
 * The allowlist is the union of `defaultKeys`, `istKeys` and `pocKeys` in
 * frontend/src/pages/SessionForm/constants.js, plus the keys `onFormSubmit` adds
 * after `reduceDataToMatchKeys` runs. The frontend arrays narrow a save to one
 * role's fields so roles don't clobber each other during the merge in
 * `updateSession`; this schema is the server-side superset of all of them.
 */
// Exported for the drift guard in ./middleware.test.js, which asserts this stays
// a superset of the role key arrays in frontend/src/pages/SessionForm/constants.js.
export const sessionDataSchema = Joi.object({
  // identity / display, mostly server-injected then round-tripped
  id: Joi.any(),
  regionId: numberish,
  ownerId: numberish,
  eventId: numberish,
  eventDisplayId: looseString,
  eventName: looseString,
  eventOwner: numberish,
  /**
   * Sessions store REPORT_STATUSES.NEEDS_ACTION here alongside the training
   * report statuses: the approver's "request changes" path in
   * frontend/src/pages/SessionForm/index.js (onReview) writes it, the fetch
   * path reads it back, and rows in the database carry it. Leaving it out
   * would 400 every later save of a session that was sent back for changes.
   */
  status: Joi.string()
    .valid(...Object.values(TRAINING_REPORT_STATUSES), REPORT_STATUSES.NEEDS_ACTION)
    .allow('', null),
  pageState: Joi.any(),

  // session summary (IST)
  sessionName: looseString,
  startDate: displayDate,
  endDate: displayDate,
  duration: numberish,
  context: looseString,
  objective: looseString,
  objectiveTopics: stringArray,
  objectiveSupportType: Joi.string()
    .valid(...SUPPORT_TYPES)
    .allow('', null),
  objectiveResources: optionList,
  objectiveTrainers: stringArray, // written by src/models/hooks/nationalCenter.js
  useIpdCourses: Joi.boolean(),
  courses: optionList,
  addObjectiveFilesYes: Joi.any(),
  files: optionList,
  ttaProvided: looseString,

  // participants (POC)
  isIstVisit: Joi.string().valid('yes', 'no').allow('', null),
  regionalOfficeTta: Joi.any(),
  recipients: optionList,
  participants: optionList,
  ttaType: stringArray,
  numberOfParticipants: numberish,
  numberOfParticipantsInPerson: numberish,
  numberOfParticipantsVirtually: numberish,
  deliveryMethod: Joi.string().valid('in-person', 'virtual', 'hybrid').allow('', null),
  language: stringArray,
  supportingAttachments: optionList,
  istSelectionComplete: Joi.any(),
  'pageVisited-supporting-attachments': Joi.any(),

  // next steps
  recipientNextSteps: nextSteps,
  specialistNextSteps: nextSteps,

  // completion / approval markers
  facilitation: Joi.string()
    .valid(FACILITATION_NATIONAL_CENTER, 'regional_tta_staff', 'both')
    .allow('', null),
  pocComplete: Joi.boolean(),
  pocCompleteId: numberish,
  pocCompleteDate: looseString,
  collabComplete: Joi.boolean(),
  collabCompleteId: numberish,
  collabCompleteDate: looseString,
  ownerComplete: Joi.boolean(),
  ownerCompleteId: numberish,
  ownerCompleteDate: looseString,
  submitted: Joi.boolean(),
  submitter: Joi.any(),
  dateSubmitted: looseString,
  additionalNotes: looseString,
  managerNotes: looseString,
  reviewStatus: looseString,
  approvalStatus: looseString,
  additionalStates: stringArray,
  additionalRegions: regionArray,

  // Destructured out of `data` by updateSession and written to columns and join
  // tables. Stripping these would silently stop the approver, trainer and
  // goal-template writes.
  approverId: numberish,
  submitterId: numberish,
  trainers: optionList,
  otherTrainers: Joi.any(),
  goalTemplates: optionList,

  // Hydrated associations that must never be persisted back into the blob.
  // Mirrors SESSION_ASSOCIATION_KEYS in src/services/sessionReports.ts.
  event: Joi.any().strip(),
  approver: Joi.any().strip(),
  createdAt: Joi.any().strip(),
  updatedAt: Joi.any().strip(),
});

const sessionBodySchema = Joi.object({
  eventId: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  // The session form sends this alongside eventId.
  trainingReportId: Joi.any(),
  data: sessionDataSchema.required(),
});

export function checkCreateSessionBody(req: Request, res: Response, next: NextFunction) {
  const { error, value } = sessionBodySchema.validate(req.body, validationOptions);

  if (error) {
    const msg = `${errorMessage}: ${error.message}`;
    auditLogger.error(msg);
    return res.status(httpCodes.BAD_REQUEST).send(msg);
  }

  req.body = value;
  return next();
}

export function checkUpdateSessionBody(req: Request, res: Response, next: NextFunction) {
  const { error, value } = sessionBodySchema.validate(req.body, validationOptions);

  if (error) {
    const msg = `${errorMessage}: ${error.message}`;
    auditLogger.error(msg);
    return res.status(httpCodes.BAD_REQUEST).send(msg);
  }

  req.body = value;
  return next();
}
