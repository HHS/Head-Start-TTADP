import { NOT_STARTED } from '../../components/Navigator/constants';

export const sessionSummaryFields = {
  // not including start date or end date
  // because when I do, it seems to befuddle the
  // loading of the form
  sessionName: '',
  duration: '',
  context: '',
  objective: '',
  objectiveTopics: [],
  objectiveTrainers: [],
  objectiveResources: [],
  objectiveSupportType: '',
  files: [],
  regionId: '',
  ttaProvided: '',
};

export const languages = [
  'English',
  'Spanish',
];

export const participantsFields = {
  participants: [],
  deliveryMethod: '',
  numberOfParticipants: '',
};

export const nextStepsFields = {
  specialistNextSteps: [{ note: '', completeDate: '' }],
  recipientNextSteps: [{ note: '', completeDate: '' }],
  pocComplete: false,
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
export const pageComplete = (
  hookForm,
  fields,
) => fields.every((field) => hookForm.getValues(field));
