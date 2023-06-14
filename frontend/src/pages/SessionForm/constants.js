import { NOT_STARTED } from '../../components/Navigator/constants';

const LOCAL_STORAGE_CACHE_NUMBER = '0.1';
export const LOCAL_STORAGE_DATA_KEY = (id) => `tr-session-form-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_ADDITIONAL_DATA_KEY = (id) => `tr-session-additional-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_EDITABLE_KEY = (id) => `tr-session-can-edit-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;

export const sessionSummaryFields = {
  sessionName: '',
  endDate: '',
  startDate: '',
  duration: '',
  context: '',
  objective: '',
  objectiveTopics: [],
  objectiveTrainers: [],
  files: [],
  addObjectiveFiles: 'no',
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

export const pageTouched = (touched, fields) => Object.keys(touched)
  .filter((error) => fields.includes(error)).length > 0;
