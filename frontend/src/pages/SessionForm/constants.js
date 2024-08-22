import React from 'react';
import { NOT_STARTED } from '../../components/Navigator/constants';

export const NO_ERROR = <></>;

export const sessionSummaryRequiredFields = {
  sessionName: '',
  duration: '',
  context: '',
  objective: '',
  objectiveTopics: [],
  objectiveTrainers: [],
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
};

export const participantsFields = {
  deliveryMethod: '',
  numberOfParticipants: '',
  language: [],
  isIstVisit: '',
};

export const nextStepsFields = {
  specialistNextSteps: [{ note: '', completeDate: '' }],
  recipientNextSteps: [{ note: '', completeDate: '' }],
  pocComplete: false,
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

export const istKeys = [
  'sessionName',
  'startDate',
  'endDate',
  'duration',
  'context',
  'objective',
  'objectiveTopics',
  'objectiveTrainers',
  'useIpdCourses',
  'courses',
  'objectiveResources',
  'addObjectiveFilesYes',
  'files',
  'ttaProvided',
  'objectiveSupportType',
  'pocComplete',
  'ownerComplete',
];

export const pocKeys = [
  'isIstVisit',
  'regionalOfficeTta',
  'recipients',
  'participants',
  'numberOfParticipants',
  'numberOfParticipantsInPerson',
  'numberOfParticipantsVirtually',
  'deliveryMethod',
  'language',
  'supportingAttachments',
  'recipientNextSteps',
  'specialistNextSteps',
  'pocComplete',
  'ownerComplete',
];
