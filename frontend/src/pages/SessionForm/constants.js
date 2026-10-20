import React from 'react';
import { NOT_STARTED } from '../../components/Navigator/constants';
import sessionKeys from './sessionKeys.json';

export const NO_ERROR = <></>;

export const sessionSummaryRequiredFields = {
  sessionName: '',
  duration: '',
  objective: '',
  objectiveTopics: [],
  trainers: [],
  objectiveSupportType: '',
  regionId: '',
  ttaProvided: '',
};

export const sessionSummaryFields = {
  // not including start date or end date
  // because when I do, it seems to befuddle the
  // loading of the form
  ...sessionSummaryRequiredFields,
  objectiveResources: [],
  courses: [],
  files: [],
  context: '',
};

export const participantsFields = {
  deliveryMethod: '',
  numberOfParticipants: '',
  language: [],
  ttaType: [],
};

export const nextStepsFields = {
  specialistNextSteps: [{ note: '', completeDate: '' }],
  recipientNextSteps: [{ note: '', completeDate: '' }],
  pocComplete: false,
  collabComplete: false,
  ownerComplete: false,
};

export const defaultFormValues = {
  ...sessionSummaryFields,
  ...participantsFields,
  ...nextStepsFields,
};

export const defaultValues = {
  ...defaultFormValues,
  id: 0,
  ownerId: null,
  eventId: '',
  eventDisplayId: '',
  eventName: '',
  approver: null,
  approverId: '',
  approvalStatus: '',
  submitted: false,
  status: 'In progress',
  pageState: {
    1: NOT_STARTED,
    2: NOT_STARTED,
    3: NOT_STARTED,
    4: NOT_STARTED,
  },
};

export const baseDefaultValues = {
  id: 0,
  regionId: 0,
  ownerId: null,
  eventId: '',
  eventDisplayId: '',
  eventName: '',
  status: 'In progress',
  pageState: {
    1: NOT_STARTED,
    2: NOT_STARTED,
    3: NOT_STARTED,
    4: NOT_STARTED,
  },
  additionalNotes: '',
  managerNotes: '',
  approver: null,
  dateSubmitted: '',
};

export const pageComplete = (hookForm, fields) =>
  fields.every((field) => {
    const val = hookForm.getValues(field);

    if (Array.isArray(val)) {
      return val.length > 0;
    }

    if (typeof val === 'string') {
      return !!val.trim();
    }

    return !!val;
  });

/**
 * The key lists live in sessionKeys.json rather than here so the backend can
 * read them too: src/routes/sessionReports/middleware.test.js asserts that the
 * Joi allowlist is a superset of everything this form can send. A key added
 * here without being declared there would be stripped on save, and a list
 * duplicated by hand in the backend test could not catch that.
 */
export const { supportingAttachmentsVisitedField, defaultKeys, submitTimeKeys } = sessionKeys;

export const istKeys = [...defaultKeys, ...sessionKeys.istOnlyKeys];

export const pocKeys = [...defaultKeys, ...sessionKeys.pocOnlyKeys];
