import { NOT_STARTED } from '../../components/Navigator/constants';

const LOCAL_STORAGE_CACHE_NUMBER = '0.1';
export const LOCAL_STORAGE_DATA_KEY = (id) => `tr-form-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_ADDITIONAL_DATA_KEY = (id) => `tr-additional-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_EDITABLE_KEY = (id) => `tr-can-edit-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;

export const eventSummaryFields = {
  eventOrganizer: null,
  collaboratorIds: [],
  pocId: [],
  eventIntendedAudience: '',
  startDate: '',
  endDate: '',
  trainingType: 'Series',
  reasons: [],
  targetPopulations: [],
};

export const visionGoalFields = {
  vision: '',
  goal: '',
};

export const defaultFormValues = {
  ...eventSummaryFields,
  ...visionGoalFields,
};

export const defaultValues = {
  ...defaultFormValues,
  status: 'Not started',
  id: 0,
  ownerId: null,
  eventId: '',
  eventName: '',
  region: 0,
  pageState: {
    1: NOT_STARTED,
    2: NOT_STARTED,
  },
};
export const pageComplete = (
  hookForm,
  fields,
) => fields.every((field) => hookForm.getValues(field));

export const pageTouched = (touched, fields) => Object.keys(touched)
  .filter((error) => fields.includes(error)).length > 0;
