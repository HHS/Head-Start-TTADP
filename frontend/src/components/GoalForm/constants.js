import React from 'react';
import { v4 as uuidv4 } from 'uuid';

// regex to match a valid url, it must start with http:// or https://, have at least one dot, and not end with a dot or a space
const VALID_URL_REGEX = /^https?:\/\/.*\.[^ |^.]/;

export const isValidUrl = (attempted) => {
  try {
    const u = new URL(attempted);
    return (u !== '' && VALID_URL_REGEX.test(u));
  } catch (e) {
    return false;
  }
};

export const GOAL_NAME_ERROR = 'Enter the recipient\'s goal';
export const GOAL_DATE_ERROR = 'Enter a valid date';
export const SELECT_GRANTS_ERROR = 'Select at least one recipient grant number';
export const OBJECTIVES_EMPTY = 'Every report must have at least one objective';

export const FORM_FIELD_INDEXES = {
  GRANTS: 0,
  NAME: 1,
  END_DATE: 2,
  OBJECTIVES_EMPTY: 3,
  OBJECTIVES: 4,
};

export const FORM_FIELD_DEFAULT_ERRORS = [<></>, <></>, <></>, <></>, []];

export const OBJECTIVE_DEFAULTS = (l) => ({
  title: '',
  topics: [],
  resources: [{ key: uuidv4(), value: '' }],
  id: `new-${l}`,
  status: 'Not Started',
  isNew: true,
});

export const OBJECTIVE_FORM_FIELD_INDEXES = {
  TITLE: 0,
  TOPICS: 1,
  RESOURCES: 2,
  STATUS: 3,
};

export const OBJECTIVE_DEFAULT_ERRORS = [<></>, <></>, <></>, <></>];

export const TTA_OBJECTIVE_ERROR = 'Enter the TTA objective';
export const OBJECTIVE_TOPIC_ERROR = 'Select at least one topic';
export const OBJECTIVE_LINK_ERROR = 'Enter a valid link';
export const OBJECTIVE_STATUS_ERROR = 'Select a status';

export const OBJECTIVE_ERROR_MESSAGES = [
  TTA_OBJECTIVE_ERROR,
  OBJECTIVE_TOPIC_ERROR,
  OBJECTIVE_LINK_ERROR,
  OBJECTIVE_STATUS_ERROR,
];

export const validateListOfResources = (resources) => {
  if (resources.length > 1 || (resources.length === 1 && resources[0].value)) {
    const allValidResources = resources.reduce((a, c) => {
      if (a && c.value) {
        return isValidUrl(c.value);
      }

      return a;
    }, true);

    return allValidResources;
  }

  return true;
};
