import React from 'react';
import { NOT_STARTED } from '../../components/Navigator/constants';

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

export const pageComplete = (
  hookForm,
  fields,
) => fields.every((field) => {
  const val = hookForm.getValues(field);

  if (Array.isArray(val)) {
    return val.length > 0;
  }
  return !!(val);
});

export const supportingAttachmentsVisitedField = 'pageVisited-supporting-attachments';

export const defaultKeys = [
  'id',
  'regionId',
  'ownerId',
  'eventId',
  'eventDisplayId',
  'eventName',
  'status',
  'pageState',
  'pocComplete',
  'collabComplete',
  'facilitation',
  'additionalNotes',
  'approverId',
  'managerNotes',
  'dateSubmitted',
  'submitted',
  'submitter',
  'additionalStates',
  'reviewStatus',
  'approvalStatus',
  'trainers',
];

export const istKeys = [
  ...defaultKeys,
  'sessionName',
  'startDate',
  'endDate',
  'duration',
  'context',
  'objective',
  'objectiveTopics',
  'goalTemplates',
  'useIpdCourses',
  'courses',
  'objectiveResources',
  'addObjectiveFilesYes',
  'files',
  'ttaProvided',
  'objectiveSupportType',
];

export const pocKeys = [
  ...defaultKeys,
  'isIstVisit',
  'regionalOfficeTta',
  'recipients',
  'participants',
  'ttaType',
  'numberOfParticipants',
  'numberOfParticipantsInPerson',
  'numberOfParticipantsVirtually',
  'deliveryMethod',
  'language',
  'supportingAttachments',
  'recipientNextSteps',
  'specialistNextSteps',
  'istSelectionComplete',
  supportingAttachmentsVisitedField,
];
