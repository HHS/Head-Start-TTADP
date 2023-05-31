const LOCAL_STORAGE_CACHE_NUMBER = '0.1';
export const LOCAL_STORAGE_DATA_KEY = (id) => `tr-form-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_ADDITIONAL_DATA_KEY = (id) => `tr-additional-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_EDITABLE_KEY = (id) => `tr-can-edit-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;

export const defaultValues = {
  eventId: '',
  eventName: '',
  region: 0,
  pageState: {
    1: 'NOT_STARTED',
  },
  eventCollaborators: [],
  eventOrganizer: null,
};
