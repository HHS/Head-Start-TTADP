import React from 'react';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';

export const isValidUrl = (attempted) => {
  try {
    const u = new URL(attempted);
    return u !== '';
  } catch (e) {
    return false;
  }
};

export const FORM_FIELD_INDEXES = {
  GRANTS: 0,
  NAME: 1,
  END_DATE: 2,
  OBJECTIVES: 3,
};

export const FORM_FIELD_DEFAULT_ERRORS = [<></>, <></>, <></>, []];

export const OBJECTIVE_DEFAULTS = (l) => ({
  title: '',
  topics: [],
  resources: [{ key: uuidv4(), value: '' }],
  id: `new${l}`,
  status: 'Not started',
});

export const OBJECTIVE_FORM_FIELD_INDEXES = {
  TITLE: 0,
  TOPICS: 1,
  RESOURCES: 2,
  STATUS: 3,
};

export const OBJECTIVE_DEFAULT_ERRORS = [<></>, <></>, <></>];
export const OBJECTIVE_ERROR_MESSAGES = [
  'Enter the TTA objective',
  'Select at least one topic',
  'Enter a valid link',
  'Select a status',
];

export const validateListOfResources = (resources) => {
  if (resources.length > 1 || (resources.length === 1 && resources[0].value)) {
    const allValidResources = resources.reduce((a, c) => {
      if (a) {
        return isValidUrl(c.value);
      }
      return a;
    }, true);

    return allValidResources;
  }

  return true;
};

export const formatEndDateForPicker = (endDate) => {
  if (!endDate || endDate === 'Invalid date') {
    return null;
  }

  const parsed = moment(endDate, 'MM/DD/YYYY');
  if (parsed.isValid()) {
    return parsed.format('YYYY-MM-DD');
  }

  return null;
};
