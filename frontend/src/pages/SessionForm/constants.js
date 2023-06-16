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
  files: [],
  supportType: '',
};

export const defaultFormValues = {
  ...sessionSummaryFields,
};

export const defaultValues = {
  ...defaultFormValues,
  id: 0,
  ownerId: null,
  eventId: '',
  eventDisplayId: '',
  eventName: '',
  regionId: 0,
  status: 'In progress',
  pageState: {
    1: NOT_STARTED,
    2: NOT_STARTED,
    3: NOT_STARTED,
  },
};
export const pageComplete = (
  hookForm,
  fields,
) => fields.every((field) => hookForm.getValues(field));
