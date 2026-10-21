import { TTA_REQUEST_MONITORING_STANDARD, TTA_REQUEST_ORIGINATORS } from '@ttahub/common';

/** the form's field names, kept in one place so the sections and their tests agree */
export const TTA_REQUEST_FIELDS = {
  RECIPIENT: 'recipient',
  GRANTS: 'grants',
  RECIPIENT_AWARE: 'recipientAware',
  ORIGINATOR: 'originator',
  GOAL: 'goal',
  CITATIONS: 'citations',
  CONTEXT: 'context',
  CREATOR_NOTES: 'creatorNotes',
  REVIEWER: 'reviewer',
} as const;

/** a goal template's standard is 'Monitoring' when citations apply to it */
export const MONITORING_STANDARD = TTA_REQUEST_MONITORING_STANDARD;

export const SELECT_PLACEHOLDER = '- Select -';

export const REQUEST_ORIGINATORS = TTA_REQUEST_ORIGINATORS.map((originator) => ({
  value: originator,
  label: originator,
}));

export const RTTAPA_ALERT =
  "This goal will be added to the recipient's RTTAPA. If it's not already in use, its status will be set to Not started. If it's already on the RTTAPA, its current status won't change.";

/** how often the form saves itself, matching the navigator's interval */
export const AUTOSAVE_INTERVAL = 1000 * 60 * 2;

export const DATE_DISPLAY_SAVED_FORMAT = 'MM/DD/YYYY [at] h:mm a';

export const defaultValues = {
  [TTA_REQUEST_FIELDS.RECIPIENT]: null,
  [TTA_REQUEST_FIELDS.GRANTS]: [],
  [TTA_REQUEST_FIELDS.RECIPIENT_AWARE]: '',
  [TTA_REQUEST_FIELDS.ORIGINATOR]: null,
  [TTA_REQUEST_FIELDS.GOAL]: null,
  [TTA_REQUEST_FIELDS.CITATIONS]: [],
  [TTA_REQUEST_FIELDS.CONTEXT]: '',
  [TTA_REQUEST_FIELDS.CREATOR_NOTES]: '',
  [TTA_REQUEST_FIELDS.REVIEWER]: null,
};

export const SUBMIT_ERROR =
  'There was an error submitting the TTA request. Please try again later.';

/**
 * Where a submitted request is shown read only, under the list it was opened from, so the
 * view's back link can return there
 */
export const ttaRequestViewPath = (ttaRequestId: number, requestRoot = '/tta-requests') =>
  `${requestRoot}/view/${ttaRequestId}`;

export const SAVE_ERROR = 'There was an error saving the TTA request. Please try again later.';

export const NO_REGION_ERROR = 'Select a recipient grant before saving a draft.';

export const LOAD_ERROR = 'Unable to load the TTA request.';
